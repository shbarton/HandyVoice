import React, { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  className?: string;
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onRefresh?: () => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  className = "",
  placeholder = "Select an option...",
  disabled = false,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  const handleSelect = (value: string) => {
    onSelect(value);
    handleClose();
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      if (onRefresh) onRefresh();
      setIsOpen(true);
    } else {
      handleClose();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`
          group relative px-3.5 py-2 text-sm bg-card
          border border-border rounded-lg min-w-[180px]
          text-left flex items-center justify-between gap-3
          transition-all duration-200 ease-out
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(28,35,51,0.08)] cursor-pointer active:scale-[0.98]"
          }
          ${isOpen && !disabled ? "border-primary/50 shadow-[0_2px_12px_rgba(28,35,51,0.1)]" : ""}
        `}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className={`truncate font-medium ${selectedOption ? "text-foreground" : "text-muted-foreground"}`}
        >
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180 text-primary" : "group-hover:text-foreground"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className={`
            absolute top-full left-0 mt-1.5 min-w-full w-max
            bg-popover border border-border rounded-xl
            shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)]
            z-[100] max-h-64 overflow-hidden
            origin-top
            ${
              isClosing
                ? "animate-[dropdownClose_150ms_ease-out_forwards]"
                : "animate-[dropdownOpen_200ms_ease-out_forwards]"
            }
          `}
          role="listbox"
        >
          <div className="p-1.5 overflow-y-auto max-h-[calc(16rem-0.75rem)] bg-popover">
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-muted-foreground text-center italic">
                No options available
              </div>
            ) : (
              options.map((option, index) => {
                const isSelected = selectedValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`
                      w-full px-3 py-2 text-sm text-left rounded-lg
                      flex items-center justify-between gap-3
                      transition-all duration-150 ease-out
                      ${
                        isSelected
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-foreground hover:bg-secondary/80"
                      }
                      ${
                        option.disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer active:bg-secondary"
                      }
                    `}
                    style={{ animationDelay: `${index * 25}ms` }}
                    onClick={() =>
                      !option.disabled && handleSelect(option.value)
                    }
                    disabled={option.disabled}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-primary shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
