import React from "react";
import { useSettings } from "../hooks/useSettings";
import { Dashboard } from "./Dashboard";
import { SidebarSection } from "../lib/types";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
} from "./settings";

interface SectionConfig {
  label: string;
  icon: string;
  component: React.ComponentType<any>;
  enabled: (settings: any) => boolean;
}

export const SECTIONS_CONFIG: Record<string, SectionConfig> = {
  dashboard: {
    label: "Dashboard",
    icon: "dashboard",
    component: Dashboard,
    enabled: () => true,
  },
  general: {
    label: "General",
    icon: "tune",
    component: GeneralSettings,
    enabled: () => true,
  },
  advanced: {
    label: "Advanced",
    icon: "settings_applications",
    component: AdvancedSettings,
    enabled: () => true,
  },
  postprocessing: {
    label: "Post Process",
    icon: "auto_awesome",
    component: PostProcessingSettings,
    enabled: (settings) => settings?.post_process_enabled ?? false,
  },
  history: {
    label: "History",
    icon: "history",
    component: HistorySettings,
    enabled: () => true,
  },
  debug: {
    label: "Debug",
    icon: "bug_report",
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  about: {
    label: "About",
    icon: "info",
    component: AboutSettings,
    enabled: () => true,
  },
};

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { settings } = useSettings();

  return (
    <aside className="w-72 flex-shrink-0 bg-transparent flex flex-col p-8 animate-reveal">
      <div className="flex items-center gap-4 px-2 mb-12">
        <div className="bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center rounded-xl font-bold text-2xl font-serif shadow-lg shadow-primary/20">
          H
        </div>
        <span className="text-2xl font-bold font-serif text-primary tracking-tight">
          Handy
        </span>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-3">
          {Object.entries(SECTIONS_CONFIG).map(([key, config]) => {
            if (!config.enabled(settings)) return null;

            const isActive = activeSection === key;
            return (
              <li key={key}>
                <button
                  onClick={() => onSectionChange(key as SidebarSection)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? "bg-white shadow-sm text-accent font-semibold translate-x-1"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                  >
                    {config.icon}
                  </span>
                  <span className="text-base tracking-wide">
                    {config.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex flex-col gap-4 px-2">
        <button className="w-full flex items-center gap-3 text-muted-foreground hover:text-destructive transition-colors text-sm font-medium py-2">
          <span className="material-symbols-outlined text-xl">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
