import React, { useEffect, useRef, useState } from "react";

interface SettingContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  layout?: "horizontal" | "stacked";
  disabled?: boolean;
  tooltipPosition?: "top" | "bottom";
}

export const SettingContainer: React.FC<SettingContainerProps> = ({
  title,
  description,
  children,
  descriptionMode = "tooltip",
  grouped = false,
  layout = "horizontal",
  disabled = false,
  tooltipPosition = "top",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTooltip]);

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const containerClasses = grouped
    ? "px-4 py-3"
    : "px-4 py-3 rounded-xl border border-border/60 bg-card";

  if (layout === "stacked") {
    if (descriptionMode === "tooltip") {
      return (
        <div className={containerClasses}>
          <div className="flex items-center gap-2 mb-2">
            <h3
              className={`text-sm font-medium ${disabled ? "opacity-50" : ""}`}
            >
              {title}
            </h3>
            <div
              ref={tooltipRef}
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={toggleTooltip}
            >
              <svg
                className="w-4 h-4 text-muted-foreground cursor-help hover:text-primary transition-colors duration-200 select-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="More information"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTooltip();
                  }
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2.5 px-3.5 py-2.5 bg-card border border-border rounded-xl shadow-[0_8px_30px_rgba(28,35,51,0.12)] z-50 max-w-xs min-w-[200px] whitespace-normal animate-in fade-in-0 zoom-in-95 duration-200">
                  <p className="text-sm text-foreground text-center leading-relaxed">
                    {description}
                  </p>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border"></div>
                </div>
              )}
            </div>
          </div>
          <div className="w-full">{children}</div>
        </div>
      );
    }

    return (
      <div className={containerClasses}>
        <div className="mb-2">
          <h3 className={`text-sm font-medium ${disabled ? "opacity-50" : ""}`}>
            {title}
          </h3>
          <p className={`text-sm ${disabled ? "opacity-50" : ""}`}>
            {description}
          </p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  // Horizontal layout (default)
  const horizontalContainerClasses = grouped
    ? "flex items-start justify-between px-5 py-4 hover:bg-muted/30 transition-colors duration-200"
    : "flex items-start justify-between px-5 py-4 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all duration-200";

  if (descriptionMode === "tooltip") {
    return (
      <div className={horizontalContainerClasses}>
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2">
            <h3
              className={`text-[15px] font-medium text-foreground ${disabled ? "opacity-50" : ""}`}
            >
              {title}
            </h3>
            <div
              ref={tooltipRef}
              className="relative flex items-center"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={toggleTooltip}
            >
              <svg
                className="w-4 h-4 text-muted-foreground/70 cursor-help hover:text-accent transition-colors duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {showTooltip && (
                <div
                  className={`absolute ${tooltipPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-1/2 -translate-x-1/2 px-3 py-2 bg-white border border-border rounded-lg shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)] z-[100] min-w-[240px] max-w-xs animate-in fade-in zoom-in-95 duration-200`}
                >
                  <p className="text-sm text-popover-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex-shrink-0 pt-0.5">{children}</div>
      </div>
    );
  }

  return (
    <div className={horizontalContainerClasses}>
      <div className="flex-1 mr-8">
        <h3
          className={`text-[15px] font-medium text-foreground leading-none mb-1.5 ${disabled ? "opacity-50" : ""}`}
        >
          {title}
        </h3>
        <p
          className={`text-[13px] text-muted-foreground leading-relaxed max-w-lg ${disabled ? "opacity-50" : ""}`}
        >
          {description}
        </p>
      </div>
      <div className="relative flex-shrink-0 pt-0.5">{children}</div>
    </div>
  );
};
