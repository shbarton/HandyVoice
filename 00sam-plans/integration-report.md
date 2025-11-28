# Handy → VoiceToText Integration Report

Goal: build our VoiceToText feature set (Deepgram option, credit tracking, Stripe billing) on top of the Handy codebase while keeping Handy’s offline/local model flow intact.

## Handy quick audit (v0.6.2)
- Platform: Tauri (Rust backend + React/TS frontend, Tailwind v4), no external server dependency.
- Transcription: fully local via `transcribe_rs` (Whisper + Parakeet) in `src-tauri/src/managers/transcription.rs`; model inventory/downloads in `src-tauri/src/managers/model.rs`; audio capture/VAD in `src-tauri/src/managers/audio.rs` (Silero VAD, cpal).
- Shortcut + action flow: global shortcuts (rdev) trigger `TranscribeAction` in `src-tauri/src/actions.rs`, which records audio, calls `TranscriptionManager::transcribe`, then pastes text.
- Settings/persistence: `tauri-plugin-store` with `AppSettings` in `src-tauri/src/settings.rs` (shortcut binding, model choice, language, post-process LLMs, etc.), no auth/accounts.
- UI: React app in `src/` using Zustand stores; settings views only cover local models, audio, shortcuts, overlay, post-processing; no billing/login screens.
- Packaging: resources include VAD model and sound assets; models downloaded to app data (`models` dir) and managed by Rust.

## VoiceToText features to carry over
- Cloud transcription path: Deepgram (and existing OpenAI wiring) including key validation and model selection.
- Account system + credits: Supabase-backed user records, API key storage, minutes ledger, “own keys” vs “paid minutes” modes.
- Stripe checkout: product/price sync, checkout session creation, webhook handling, payment intent tracking.
- Onboarding + settings UX: API key capture/validation, usage method selection, minutes widget, admin config.

## Gaps and design decisions
1) **Backend shape**  
   - Handy has no bundled server. Our Express/Supabase/Stripe stack (server/, shared/schema.ts, migrations/) will need to remain as an external service the Tauri app talks to over HTTPS, or be bundled as a local service launched by the app (higher effort). Recommend remote service first to avoid shipping Node inside Tauri.
2) **Transcription path selection**  
   - Current Rust pipeline assumes local engine. We need a switch to route: `local Whisper/Parakeet` **or** `remote Deepgram` (and optionally OpenAI). Remote path must accept the recorded PCM (`Vec<f32>` at 16k) and POST to our server or directly to Deepgram.
3) **State & settings**  
   - AppSettings has no notion of provider, API keys, auth tokens, minutes. Need new fields (provider choice, deepgram_key preview/state, auth token, user id/minutes, “use local models” flag).
4) **Auth + secure storage**  
   - Introduce login/session handling in the frontend (reuse our Supabase/Express auth flow). Determine storage (plugin-store vs OS keychain vs secure cookie). Handy currently has none.
5) **UI/UX**  
   - Add onboarding (usage method selection, API key validation), minutes indicator, billing/checkout screens, admin settings, and API key management to the Tauri React app.
6) **Payments**  
   - Stripe flows must run through our server. Desktop app should launch Checkout in the user’s browser and poll/callback for completion; update local minutes after webhook confirmation.
7) **History/logging**  
   - Handy saves local history/audio (`HistoryManager`). Decide if remote transcriptions should still be stored locally and/or synced to our backend.

## What’s missing to be build-ready
- API contract: base URL, auth header format, and payloads/responses for auth, profile/minutes, key validation, transcription, and Stripe flows.
- Env template: concrete `.env` for the server (Supabase, Stripe, Deepgram, OpenAI) plus app-side API base URL.
- Storage policy: where to keep tokens/API keys (encrypted store vs OS keychain) and expected rotation/refresh.
- UX specifics: required screens/states for onboarding, minutes indicator rules, and admin visibility.

## Minimal API contract (from server/routes.ts)
- Auth: `Authorization: Bearer <token>` on all `/api/*` (except test). Tokens come from our Supabase/Express login/signup.
- Validate key: `POST /api/validate/deepgram` `{ apiKey }` → `{ valid: boolean, error?: string }`.
- Profile/minutes: `GET /api/me` (user object) and/or `GET /api/minutes` (if exposed). If missing, add an endpoint returning `{ minutesRemaining, isPaidUser, trialValid }`.
- Transcribe (Deepgram main): `POST /api/transcribe/deepgram` body `{ audioBlob: base64 webm (or data URL), apiKey?: string, model?: string, language?: string, keyterms?: string[] }` with auth header.  
  Responses:  
  - success: `{ success: true, text, duration }`  
  - failure: `{ error, requiresUpgrade?: true, minutesRequired?, minutesRemaining? }` (403 when trial/credits exhausted).  
  Server uses shared Deepgram key + minutes ledger when `apiKey` absent; uses user key without deducting minutes when present.
- Transcribe (unified): `POST /api/transcribe` `{ audio, provider: "deepgram" | "openai" }` using server keys and trial enforcement.
- History: `GET /api/transcriptionHistory`, `DELETE /api/transcriptionHistory/:id`, `POST /api/transcription/save` (body includes `{ text, duration, language, model, provider, apiKey }`).
- Stripe: `/api/stripe/products`, `/api/stripe/create-checkout-session`, `/api/stripe-webhook`, `/api/admin/sync-stripe-products`. App flow: fetch products, create session, open Checkout URL, poll `/api/me`/minutes after webhook.

## Env / config template (server)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=               # drizzle DB URL
JWT_SECRET=                 # if Express issues JWTs
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CENTS=         # optional override
STRIPE_PRODUCT_NAME=        # optional override
DEEPGRAM_API_KEY=           # global/shared key fallback
OPENAI_API_KEY=             # if using OpenAI path
```

## Data model assumptions
- User: `{ id, email, isPaidUser, stripeCustomerId?, trialEndsAt?, minutesRemaining? }`.
- Usage: minutes ledger tracked per transcription; own-key mode logs but does not decrement minutes.
- Transcription history: `{ id, userId, text, duration, language, model, provider }`.

## Proposed implementation plan

### Phase 0 – Environment and baseline
- Fork Handy into this repo; keep Tauri build intact. Document build prerequisites (Rust toolchain, Tauri CLI, dev certs).
- Stand up (or point to existing) Express/Supabase/Stripe backend from current project; ensure HTTPS reachable from the app. Align env vars with `server/.env.example`.

### Phase 1 – Settings and auth plumbing
- Extend `AppSettings` (`src-tauri/src/settings.rs`) with:
  - `provider: "local" | "deepgram" | "openai"` (default “local” to preserve Handy behavior).
  - `deepgram_api_key_preview`, `openai_api_key_preview`, `auth_token`, `user_id`, `minutes_remaining`, `usage_mode: "own_keys" | "credits"`.
- Add settings UI in `src/` to capture login/signup (Supabase), API key entry/validation (call `/api/validate/deepgram`), and provider selection. Use Zustand store to mirror new settings; persist via existing store plugin.
- Wire secure storage for tokens/API keys (prefer tauri-store with encryption or OS keychain; avoid plaintext in JSON).

### Phase 2 – Remote transcription path
- Add a Rust-side branch in `TranscribeAction::stop`:
  - If provider == `local` → current flow.
  - If provider == `deepgram`/`openai` → serialize audio samples to WAV/FLAC (16k mono) and call a new Tauri command that POSTs to our server (`/api/transcribe/deepgram`) with auth token, minutes mode, keywords, model id. Use `reqwest` or `tauri-plugin-http`.
- Ensure the local model loader is skipped when provider is remote (avoid auto-loading). Update `TranscriptionManager::transcribe` to short-circuit for remote mode or move the branching higher to keep local manager unchanged.
- Handle errors/timeouts and keep overlay/tray UX consistent with local flow.

### Phase 3 – Credits and account sync
- Add periodic/minute-on-demand fetch of user profile/minutes (`/api/me`, `/api/minutes`) and store in settings/store.
- After each remote transcription, record usage via server response (our API already tracks minutes); display updated minutes in UI.
- Add UI components (minutes badge, low-balance warnings) similar to current Electron app.

### Phase 4 – Billing (Stripe)
- Expose existing server endpoints for product listing and checkout session creation.
- In Tauri frontend, call checkout creation and open the Checkout URL in default browser (tauri `shell::open`). Poll backend or use webhook-driven status endpoint to update minutes locally.
- Add “Buy minutes” and “Manage subscription” screens; include coupon handling if retained from current app.

### Phase 5 – Admin/dev utilities
- Port admin page for config keys (stripe_product_name, stripe_price_cents, trial_days, etc.) if needed for ops; hide behind role check from backend.
- Keep Handy debug overlay (`Cmd/Ctrl+Shift+D`) and add logging for remote requests.

### Phase 6 – QA and packaging
- Test matrix: local-only (no backend), remote Deepgram with own key, remote Deepgram with credits/Stripe, offline behavior, Windows/macOS/Linux audio/shortcuts.
- Validate model downloads still work; ensure remote mode does not preload models.
- Check code signing/notarization impacts of new HTTP access and external browser opens.

## File touchpoints (Handy)
- Rust backend: `src-tauri/src/actions.rs`, `managers/transcription.rs`, `settings.rs`, possibly new `commands/remote_transcription.rs`.
- Frontend: `src/stores/*` (state), `src/components/settings/*` (new panels), onboarding screens, minutes indicator, login/checkout flows.
- Packaging/config: `tauri.conf.json` (domains for updater/HTTP), `Cargo.toml` (reqwest/serde for new commands), resources if adding assets.

## Risks / open questions
- Shipping backend: rely on hosted Express/Supabase vs bundling a local Node service; hosted is lower effort but requires network access.
- Secure storage of API/auth keys in a desktop context; may need a keychain plugin.
- Handling large audio uploads over weak networks; consider streaming to Deepgram vs prerecorded file (Handy currently records then transcribes).
- Parity of shortcut/overlay UX during remote latency; may need loading states and cancel flows.

## Recommended next steps
1. Decide backend deployment model (hosted vs bundled) and target API base URL.
2. Add provider/settings scaffolding in Handy (Rust + TS) without changing behavior (provider default “local”).
3. Prototype remote Deepgram call using prerecorded audio from Handy recorder to our `/api/transcribe/deepgram`, verify end-to-end transcript + minutes decrement.
4. Layer in auth/minutes UI, then Stripe checkout flow.
