import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CancelIcon, StopIcon } from "../components/icons";
import "./RecordingOverlay.css";

type OverlayState = "recording" | "transcribing" | "error";

const RecordingOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0));
  const smoothedLevelsRef = useRef<number[]>(Array(12).fill(0));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [idleTime, setIdleTime] = useState(0);
  const idleAnimationRef = useRef<number | null>(null);

  // Animation timer for idle shimmer and processing states
  useEffect(() => {
    if ((state !== "recording" && state !== "transcribing") || !isVisible) {
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current);
        idleAnimationRef.current = null;
      }
      return;
    }

    let startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000; // seconds
      setIdleTime(elapsed);
      idleAnimationRef.current = requestAnimationFrame(animate);
    };

    idleAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current);
      }
    };
  }, [state, isVisible]);

  // Mirror levels so center bars are loudest (like ElevenLabs)
  // Left side: reversed (edge to center), Right side: normal (center to edge)
  const mirroredLevels = useMemo(() => {
    const trimmed = levels.slice(0, 12);
    if (!trimmed.length) {
      return Array(24).fill(0);
    }
    // Reverse for left half (so highest values are in center)
    // then normal for right half (highest values also in center)
    return [...trimmed.slice().reverse(), ...trimmed];
  }, [levels]);
  const halfCount = mirroredLevels.length / 2;

  useEffect(() => {
    const setupEventListeners = async () => {
      // Listen for show-overlay event from Rust
      const unlistenShow = await listen("show-overlay", (event) => {
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
        setErrorMessage(null);
      });

      // Listen for hide-overlay event from Rust
      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
        setErrorMessage(null);
      });

      // Listen for mic-level updates
      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];

        // Light smoothing - more responsive to input
        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          // Faster attack (0.5), slower decay for natural feel
          const factor = target > prev ? 0.5 : 0.35;
          return prev * (1 - factor) + target * factor;
        });

        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed.slice(0, 12));
      });

      // Listen for transcription errors to show inline toast
      const unlistenError = await listen<string>(
        "transcription-error",
        (event) => {
          const message = event.payload;
          setErrorMessage(message);
          setState("error");
          setIsVisible(true);

          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current);
          }
          errorTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            setErrorMessage(null);
          }, 3200);
        },
      );

      // Cleanup function
      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
        unlistenError();
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
      };
    };

    setupEventListeners();
  }, []);

  return (
    <div className={`recording-overlay ${isVisible ? "fade-in" : ""}`}>
      <div className="overlay-left">
        {state === "recording" && (
          <div
            className="cancel-button"
            onClick={() => {
              invoke("cancel_operation");
            }}
          >
            <CancelIcon width={14} height={14} />
          </div>
        )}
      </div>

      <div className="overlay-middle">
        {state === "recording" && !errorMessage && (
          <div className="waveform-shell">
            <div className="waveform-bars">
              {mirroredLevels.map((value, index) => {
                // Distance from center (0 at center, 1 at edges)
                const distanceFromCenter =
                  Math.abs(index - halfCount + 0.5) / halfCount;
                // Slight center boost, edges still visible
                const centerWeight = 1 - distanceFromCenter * 0.15;

                // High sensitivity - amplify quiet sounds significantly
                // Use sqrt for more aggressive amplification of low values
                const boosted = Math.min(1, Math.sqrt(value) * 2.5);
                const normalized = Math.min(1, Math.pow(boosted, 0.5));

                // Idle shimmer: gentle wave that moves left to right
                const idleWave =
                  Math.sin(idleTime * 2 + index * 0.3) * 0.03 +
                  Math.sin(idleTime * 1.3 - index * 0.2) * 0.02;
                const idleBase = 0.12 + idleWave;

                // Scale from idle base to 1.0 (max)
                const scale = Math.max(
                  idleBase,
                  idleBase + normalized * (1 - idleBase) * centerWeight,
                );
                const opacity = 0.3 + normalized * 0.7;

                return (
                  <span
                    key={`waveform-bar-${index}`}
                    className="waveform-bar"
                    style={{
                      opacity,
                      transform: `scaleY(${scale})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        {state === "transcribing" && !errorMessage && (
          <div className="waveform-shell">
            <div className="waveform-bars">
              {Array(24)
                .fill(0)
                .map((_, index) => {
                  // Distance from center (0 at center, 1 at edges)
                  const normalizedPosition = (index - 12) / 12;
                  const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4;

                  // Multiple overlapping waves for organic movement
                  const wave1 =
                    Math.sin(idleTime * 1.5 + normalizedPosition * 3) * 0.25;
                  const wave2 =
                    Math.sin(idleTime * 0.8 - normalizedPosition * 2) * 0.2;
                  const wave3 =
                    Math.cos(idleTime * 2 + normalizedPosition) * 0.15;
                  const combinedWave = wave1 + wave2 + wave3;

                  const processingValue = (0.25 + combinedWave) * centerWeight;
                  const scale = Math.max(0.08, Math.min(1, processingValue));
                  const opacity = 0.4 + scale * 0.5;

                  return (
                    <span
                      key={`processing-bar-${index}`}
                      className="waveform-bar"
                      style={{
                        opacity,
                        transform: `scaleY(${scale})`,
                      }}
                    />
                  );
                })}
            </div>
          </div>
        )}
        {state === "error" && errorMessage && (
          <div className="error-text" title={errorMessage}>
            {errorMessage}
          </div>
        )}
      </div>

      <div className="overlay-right">
        {state === "recording" && (
          <div
            className="stop-button"
            onClick={() => {
              invoke("finish_operation");
            }}
          >
            <StopIcon width={14} height={14} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingOverlay;
