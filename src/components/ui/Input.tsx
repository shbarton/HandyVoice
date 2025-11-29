import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "compact";
}

export const Input: React.FC<InputProps> = ({
  className = "",
  variant = "default",
  disabled,
  ...props
}) => {
  const baseClasses = `
    text-sm font-medium bg-card text-foreground
    border border-border rounded-lg
    placeholder:text-muted-foreground
    transition-all duration-200 ease-out
  `;

  const interactiveClasses = disabled
    ? "opacity-50 cursor-not-allowed"
    : `
      hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(28,35,51,0.06)]
      focus:outline-none focus:border-primary/50 focus:shadow-[0_2px_12px_rgba(28,35,51,0.08)]
      focus:ring-2 focus:ring-primary/10
    `;

  const variantClasses = {
    default: "px-3.5 py-2",
    compact: "px-2.5 py-1.5",
  } as const;

  return (
    <input
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
};
