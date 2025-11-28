import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import "./App.css";
import AccessibilityPermissions from "./components/AccessibilityPermissions";
import Onboarding from "./components/onboarding";
import { Sidebar, SECTIONS_CONFIG } from "./components/Sidebar";
import { SidebarSection } from "./lib/types";
import { useSettings } from "./hooks/useSettings";

const renderContent = (
  section: SidebarSection,
  onSectionChange: (section: SidebarSection) => void,
) => {
  const config = SECTIONS_CONFIG[section];

  // Fallback if config is missing (shouldn't happen if types are correct)
  if (!config) return null;

  const Component = config.component;

  // Dashboard handles its own layout
  if (section === "dashboard") {
    return <Component onNavigate={onSectionChange} />;
  }

  // Settings sections
  return (
    <div className="p-10">
      <h1 className="text-3xl font-serif font-medium text-primary mb-6">
        {config.label}
      </h1>
      <Component />
    </div>
  );
};

function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [currentSection, setCurrentSection] =
    useState<SidebarSection>("dashboard");
  const { settings, updateSetting } = useSettings();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Handle keyboard shortcuts for debug mode toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+D (Windows/Linux) or Cmd+Shift+D (macOS)
      const isDebugShortcut =
        event.shiftKey &&
        event.key.toLowerCase() === "d" &&
        (event.ctrlKey || event.metaKey);

      if (isDebugShortcut) {
        event.preventDefault();
        const currentDebugMode = settings?.debug_mode ?? false;
        updateSetting("debug_mode", !currentDebugMode);
      }
    };

    // Add event listener when component mounts
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings?.debug_mode, updateSetting]);

  const checkOnboardingStatus = async () => {
    try {
      // Always check if they have any models available
      const modelsAvailable: boolean = await invoke("has_any_models_available");
      setShowOnboarding(!modelsAvailable);
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
      setShowOnboarding(true);
    }
  };

  const handleModelSelected = () => {
    // Transition to main app - user has started a download
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onModelSelected={handleModelSelected} />;
  }

  return (
    <div className="h-screen flex bg-background text-foreground font-sans">
      <Toaster />
      <Sidebar
        activeSection={currentSection}
        onSectionChange={setCurrentSection}
      />
      <main className="flex-1 overflow-y-auto">
        <AccessibilityPermissions />
        {renderContent(currentSection, setCurrentSection)}
      </main>
    </div>
  );
}

export default App;
