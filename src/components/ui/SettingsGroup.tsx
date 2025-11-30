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
        <div className="px-1 mb-2">
          <h2 className="text-xl font-serif text-foreground/90 flex items-center gap-2">
            {title}
            <span className="h-px bg-border flex-1 ml-4 opacity-60"></span>
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
        <div className="divide-y divide-border/50">{children}</div>
      </div>
    </div>
  );
};
