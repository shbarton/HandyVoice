import React from "react";
import { ShowOverlay } from "../ShowOverlay";
import { TranslateToEnglish } from "../TranslateToEnglish";
import { ModelUnloadTimeoutSetting } from "../ModelUnloadTimeout";
import { CustomWords } from "../CustomWords";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { StartHidden } from "../StartHidden";
import { AutostartToggle } from "../AutostartToggle";
import { PasteMethodSetting } from "../PasteMethod";
import { ClipboardHandlingSetting } from "../ClipboardHandling";

export const AdvancedSettings: React.FC = () => {
  return (
    <div className="w-full max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-backwards">
        <SettingsGroup title="Advanced">
          <StartHidden descriptionMode="inline" grouped={true} />
          <AutostartToggle descriptionMode="inline" grouped={true} />
          <ShowOverlay descriptionMode="inline" grouped={true} />
          <PasteMethodSetting descriptionMode="inline" grouped={true} />
          <ClipboardHandlingSetting descriptionMode="inline" grouped={true} />
          <TranslateToEnglish descriptionMode="inline" grouped={true} />
          <ModelUnloadTimeoutSetting descriptionMode="inline" grouped={true} />
          <CustomWords descriptionMode="inline" grouped />
        </SettingsGroup>
      </div>
    </div>
  );
};
