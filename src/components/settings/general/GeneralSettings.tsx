import React from "react";
import { MicrophoneSelector } from "../MicrophoneSelector";
import { LanguageSelector } from "../LanguageSelector";
import { HandyShortcut } from "../HandyShortcut";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { OutputDeviceSelector } from "../OutputDeviceSelector";
import { PushToTalk } from "../PushToTalk";
import { AudioFeedback } from "../AudioFeedback";
import { useSettings } from "../../../hooks/useSettings";
import { VolumeSlider } from "../VolumeSlider";
import { TranscriptionProviderSettings } from "../TranscriptionProviderSettings";

export const GeneralSettings: React.FC = () => {
  const { audioFeedbackEnabled } = useSettings();
  return (
    <div className="w-full max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
        <SettingsGroup title="Transcription">
          <TranscriptionProviderSettings grouped />
        </SettingsGroup>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-backwards">
        <SettingsGroup title="General">
          <HandyShortcut descriptionMode="inline" grouped={true} />
          <LanguageSelector descriptionMode="inline" grouped={true} />
          <PushToTalk descriptionMode="inline" grouped={true} />
        </SettingsGroup>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-backwards">
        <SettingsGroup title="Sound">
          <MicrophoneSelector descriptionMode="inline" grouped={true} />
          <AudioFeedback descriptionMode="inline" grouped={true} />
          <OutputDeviceSelector
            descriptionMode="inline"
            grouped={true}
            disabled={!audioFeedbackEnabled}
          />
          <VolumeSlider disabled={!audioFeedbackEnabled} />
        </SettingsGroup>
      </div>
    </div>
  );
};
