import React from "react";
import { WordCorrectionThreshold } from "./WordCorrectionThreshold";
import { LogDirectory } from "./LogDirectory";
import { LogLevelSelector } from "./LogLevelSelector";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { HistoryLimit } from "../HistoryLimit";
import { AlwaysOnMicrophone } from "../AlwaysOnMicrophone";
import { SoundPicker } from "../SoundPicker";
import { PostProcessingToggle } from "../PostProcessingToggle";
import { MuteWhileRecording } from "../MuteWhileRecording";
import { RecordingRetentionPeriodSelector } from "../RecordingRetentionPeriod";
import { ClamshellMicrophoneSelector } from "../ClamshellMicrophoneSelector";

export const DebugSettings: React.FC = () => {
  return (
    <div className="w-full max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
        <SettingsGroup title="Debug">
          <LogDirectory grouped={true} />
          <LogLevelSelector grouped={true} />
          <SoundPicker
            label="Sound Theme"
            description="Choose a sound theme for recording start and stop feedback"
          />
          <WordCorrectionThreshold descriptionMode="inline" grouped={true} />
          <HistoryLimit descriptionMode="inline" grouped={true} />
          <RecordingRetentionPeriodSelector
            descriptionMode="inline"
            grouped={true}
          />
          <AlwaysOnMicrophone descriptionMode="inline" grouped={true} />
          <ClamshellMicrophoneSelector
            descriptionMode="inline"
            grouped={true}
          />
          <PostProcessingToggle descriptionMode="inline" grouped={true} />
          <MuteWhileRecording descriptionMode="inline" grouped={true} />
        </SettingsGroup>
      </div>
    </div>
  );
};
