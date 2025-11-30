import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { AppDataDirectory } from "../AppDataDirectory";

export const AboutSettings: React.FC = () => {
  const [version, setVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    fetchVersion();
  }, []);

  const handleDonateClick = async () => {
    try {
      await openUrl("https://handy.computer/donate");
    } catch (error) {
      console.error("Failed to open donate link:", error);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
        <SettingsGroup title="About">
          <SettingContainer
            title="Version"
            description="Current version of Handy"
            grouped={true}
            descriptionMode="inline"
          >
            <span className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
              v{version}
            </span>
          </SettingContainer>

          <AppDataDirectory descriptionMode="inline" grouped={true} />

          <SettingContainer
            title="Source Code"
            description="View source code and contribute"
            grouped={true}
            descriptionMode="inline"
          >
            <Button
              variant="secondary"
              size="md"
              onClick={() => openUrl("https://github.com/cjpais/Handy")}
            >
              View on GitHub
            </Button>
          </SettingContainer>

          <SettingContainer
            title="Support Development"
            description="Help us continue building Handy"
            grouped={true}
            descriptionMode="inline"
          >
            <Button variant="primary" size="md" onClick={handleDonateClick}>
              Donate
            </Button>
          </SettingContainer>
        </SettingsGroup>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-backwards">
        <SettingsGroup title="Acknowledgments">
          <SettingContainer
            title="Whisper.cpp"
            description="High-performance inference of OpenAI's Whisper automatic speech recognition model"
            grouped={true}
            layout="stacked"
            descriptionMode="inline"
          >
            <div className="text-sm text-muted-foreground leading-relaxed mt-2 p-3 bg-muted/20 rounded-lg border border-border/40">
              Handy uses Whisper.cpp for fast, local speech-to-text processing.
              Thanks to the amazing work by Georgi Gerganov and contributors.
            </div>
          </SettingContainer>
        </SettingsGroup>
      </div>
    </div>
  );
};
