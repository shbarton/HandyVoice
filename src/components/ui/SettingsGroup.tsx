import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-3">
      {title && (
        <div className="px-1">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="bg-card border border-border/60 rounded-xl shadow-[0_1px_3px_rgba(28,35,51,0.04)] overflow-visible">
        <div className="divide-y divide-border/40">{children}</div>
      </div>
    </div>
  );
};
