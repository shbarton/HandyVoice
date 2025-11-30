# Integration Progress – Handy ↔ VoiceToText

## Current state
- Added remote transcription path with Deepgram:
  - Uses dedicated Deepgram model setting (defaults to `nova-3`, falls back to `nova-2` on 403).
  - Honors provider selection (`local` vs `deepgram` vs `openai`) and skips local model loading when remote.
  - Serializes recorded audio to WAV → base64 data URL for `/api/transcribe/deepgram` or direct Deepgram calls when no backend URL is set.
  - In-app overlay now shows a brief error toast on failures (no audio, HTTP errors, model access issues).
- Settings and storage:
  - New Deepgram-only fields: `deepgram_model`, `use_secure_key_storage`, separate from local `selected_model`.
  - Key storage toggle: Secure (Keychain/Credential Manager, default, caches in-memory per run) or Local (no prompts, less secure). Validation stores a preview; secure mode keeps full keys in OS vault.
  - Provider switch hides local model selector; Deepgram model dropdown lives in the Transcription settings section.
- UX polish:
  - Larger default window (1500x1000, min 1000x750).
  - Footer hides local ModelSelector when provider is not `local`.
  - Overlay error messaging to avoid digging through logs.
- Code cleanup:
  - Removed unused upgrade field and dead functions; `cargo check` clean.
  - Deepgram model parsing guards against Parakeet/Whisper IDs leaking into cloud calls.

## Open items / next steps
- Auth + minutes: add login (Supabase/Express), store auth token, call `/api/me`/minutes on startup and after each remote transcription; show minutes badge/warnings.
- Deepgram credits mode: ensure `/api/transcribe/deepgram` includes auth in credits mode; surface 403/upgrade responses in UI.
- Stripe: fetch products, create checkout session, open browser, poll `/api/me` after webhook.
- Optional: Deepgram keywords/custom vocabulary support; add UI to pass `keywords` when using Nova-3.
- Production hardening: signed builds to reduce Keychain prompts to first-use only; telemetry/log grooming.
