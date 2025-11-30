# Recording Overlay Widget – UI Design Compatibility Notes

## 1. Purpose & Operating Environment

- **Role:** A lightweight status widget that appears during capture/transcription to reassure users, display live audio energy, and expose a cancel action. It should _not_ trigger recording/transcription logic on its own.
- **Hosting stack:** Standalone React bundle rendered inside a dedicated 172×36px Tauri window (`recording_overlay`). No React context providers, TanStack Query, or Tailwind utilities are available in this build.
- **Communication model:** The widget is driven entirely by backend events emitted from `src-tauri/src/overlay.rs` and `src-tauri/src/actions.rs`:
  - `show-overlay` payload: `"recording" | "transcribing"`
  - `hide-overlay`
  - `mic-level` payload: `number[]` (up to 16 floats from 0.0–1.0)
  - `transcription-error` payload: string message
  - Cancel button must call `invoke("cancel_operation")`.
- **Lifecycle:** Backend shows the window, repositions it on the active monitor, hides it after fade-out. The UI cannot rely on user-driven dragging or resizing.

## 2. Visual Constraints

- **Canvas:** 172px width × 36px height. Maintain rounded-capsule silhouette to align with floating window chrome.
- **Grid:** Current layout uses three columns (icon | status area | optional cancel button). Designers can rearrange within this footprint but must leave room for both icon and button.
- **Color/Theme:** Overlay sits above arbitrary desktop content; target high contrast on a translucent dark background (`rgba(0,0,0,0.8–0.9)`). Avoid transparency that could reduce readability.
- **Typography:** System fonts only (e.g., `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`). Keep text ≤12px to prevent truncation.
- **Animations:** CSS-only. No Tailwind, Framer Motion, or canvas APIs. Simple transitions (opacity, height) and keyframes are acceptable.

## 3. State Model & Required UI Elements

| State           | Trigger                                                   | Required Elements                                                                                              |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Recording       | `show-overlay` = `"recording"`, `mic-level` stream active | Microphone icon, animated bars reflecting `mic-level`, cancel button.                                          |
| Transcribing    | `show-overlay` = `"transcribing"`                         | Transcription icon (or text) plus subtle progress indicator. No mic bars. Cancel button hidden.                |
| Error Toast     | `transcription-error`                                     | Error message text (max two lines) with optional warning icon; auto-dismiss after ~3.2s per existing behavior. |
| Hidden/Fade-out | `hide-overlay`                                            | Overlay should animate opacity to 0 before backend hides window. No user controls visible.                     |

## 4. Component Guidelines

- **Icons:** Reuse existing React icons in `src/components/icons` (`MicrophoneIcon`, `TranscriptionIcon`, `CancelIcon`). Provide vector-friendly specs (24×24 viewbox) if proposing new artwork.
- **Level Bars:** Expect up to 9 bars rendered from the smoothed array. Heights clamp to 4px–20px; opacity 0.2–1.0. Designers can change count/shape but must map directly from amplitude floats without extra libraries.
- **Cancel Control:** Circular 24px button. Interaction states (hover, active) must be describable in plain CSS. Action strictly calls `invoke("cancel_operation")`; do not introduce additional menu items.
- **Error Treatment:** Fits within middle column; text must not overflow the 172px width. Provide tooltip copy identical to inline text when truncated.
- **Loading/Transcribing Indicators:** Favor lightweight iconography or text pulses; avoid spinners that require additional SVG assets or fonts unless included in repo.

## 5. Accessibility & UX Considerations

- Maintain WCAG AA contrast against dark background.
- Minimum hit area for cancel button: 24px × 24px.
- Provide non-color cues for state (e.g., text labels “Recording”, “Transcribing”).
- Animations should run at ≤60ms updates to match backend smoothing cadence; avoid long-running timers that might block hide animation.

## 6. Implementation Guardrails for Designers

- **Asset delivery:** Supply static SVGs or CSS specs; avoid PNGs unless absolutely necessary (the overlay already relies on inline SVG React components).
- **Fonts:** No custom font files; specify system stacks only.
- **Libraries:** Widget bundle cannot take dependencies on Tailwind, Shadcn, Lucide, etc. Designs should be reproducible using plain CSS + existing icon components.
- **States first:** Provide mockups for recording, recording-hover (cancel), transcribing, error, and hidden transitions. Include mic-level sample frames (low, medium, high) to illustrate bar behavior.
- **Sizing tokens:** Document padding, gaps, stroke widths in px (not rem) to match current CSS approach.
- **Copy:** Keep strings short (“Transcribing…”, “Tap to cancel”). Localizable text should fit within middle column without wrapping more than two lines.

## 7. Handoff Checklist for the Coding Designer Agent

1. Annotated mockups covering every state listed above.
2. Color palette with rgba/hex values plus opacity guidance.
3. Specs for animated mic bars (count, min/max height, transition timing).
4. Interaction notes for cancel button hover/press.
5. Error message layout with truncation rules.
6. Confirmation that assets reuse existing React icons or include SVG alternatives compatible with JSX.

Following these constraints ensures any new visual treatment drops into `src/overlay/RecordingOverlay.tsx` without reworking the backend, build system, or dependency graph.
