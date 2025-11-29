import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}) => {
  const baseClasses = `
    font-medium rounded-lg border
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    cursor-pointer active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-offset-1
  `;

  const variantClasses = {
    primary: `
      text-primary-foreground bg-primary border-primary
      hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(28,35,51,0.2)]
      focus:ring-primary/30
    `,
    secondary: `
      text-foreground bg-card border-border
      hover:border-primary/40 hover:bg-secondary/50 hover:shadow-[0_2px_8px_rgba(28,35,51,0.06)]
      focus:ring-primary/20
    `,
    danger: `
      text-destructive-foreground bg-destructive border-destructive
      hover:bg-destructive/90 hover:shadow-[0_4px_12px_rgba(217,48,37,0.25)]
      focus:ring-destructive/30
    `,
    ghost: `
      text-foreground bg-transparent border-transparent
      hover:bg-secondary hover:border-border
      focus:ring-primary/20
    `,
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
