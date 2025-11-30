import React from "react";
import { SettingContainer } from "./SettingContainer";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  label: string;
  description: string;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  tooltipPosition?: "top" | "bottom";
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  isUpdating = false,
  label,
  description,
  descriptionMode = "tooltip",
  grouped = false,
  tooltipPosition = "top",
}) => {
  return (
    <SettingContainer
      title={label}
      description={description}
      descriptionMode={descriptionMode}
      grouped={grouped}
      disabled={disabled}
      tooltipPosition={tooltipPosition}
    >
      <label
        className={`inline-flex items-center ${disabled || isUpdating ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          value=""
          className="sr-only peer"
          checked={checked}
          disabled={disabled || isUpdating}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`
            relative w-[46px] h-[26px] rounded-full
            bg-input transition-colors duration-300 ease-in-out
            peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 peer-focus:ring-offset-2
            peer-checked:bg-primary
            after:content-[''] after:absolute after:top-[3px] after:start-[3px]
            after:bg-white after:rounded-full after:h-[20px] after:w-[20px]
            after:shadow-[0_2px_4px_rgba(0,0,0,0.15)]
            after:transition-all after:duration-300 after:cubic-bezier(0.34,1.56,0.64,1)
            peer-checked:after:translate-x-5
            hover:after:scale-95
          `}
        />
      </label>
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </SettingContainer>
  );
};
