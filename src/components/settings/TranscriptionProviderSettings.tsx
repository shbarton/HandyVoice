import React, { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface TranscriptionProviderSettingsProps {
  grouped?: boolean;
}

export const TranscriptionProviderSettings: React.FC<
  TranscriptionProviderSettingsProps
> = ({ grouped = false }) => {
  const {
    settings,
    updateSetting,
    isUpdating,
    validateDeepgramKey,
    setSecureKeyStorage,
  } = useSettings();

  const provider = settings?.provider ?? "local";
  const usageMode = settings?.usage_mode ?? "own_keys";
  const apiBaseUrl = settings?.api_base_url ?? "";
  const useSecureStorage = settings?.use_secure_key_storage ?? true;
  const deepgramModel = settings?.deepgram_model ?? "nova-3";
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(apiBaseUrl || "");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [validationState, setValidationState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [validationMessage, setValidationMessage] = useState<string>("");

  useEffect(() => {
    setApiBaseUrlInput(apiBaseUrl || "");
  }, [apiBaseUrl]);

  const handleProviderChange = async (value: string) => {
    await updateSetting("provider", value as any);
  };

  const handleUsageModeChange = async (value: string) => {
    await updateSetting("usage_mode", value as any);
  };

  const handleSaveBaseUrl = async () => {
    await updateSetting("api_base_url", apiBaseUrlInput.trim() || null);
  };

  const handleValidateKey = async () => {
    setValidationState("idle");
    setValidationMessage("");
    try {
      if (apiBaseUrlInput !== apiBaseUrl) {
        await updateSetting(
          "api_base_url",
          apiBaseUrlInput.trim() ? apiBaseUrlInput.trim() : null,
        );
      }
      await validateDeepgramKey(apiKeyInput);
      setValidationState("success");
      setValidationMessage(
        apiBaseUrlInput.trim()
          ? "Key saved for preview; remote calls use stored session auth."
          : "Key saved locally for direct Deepgram requests.",
      );
      setApiKeyInput("");
    } catch (error) {
      setValidationState("error");
      setValidationMessage(
        error instanceof Error
          ? error.message
          : "Failed to validate the Deepgram key.",
      );
    }
  };

  const providerOptions = [
    { value: "local", label: "Local (Handy built-in)" },
    { value: "deepgram", label: "Deepgram (cloud)" },
    { value: "openai", label: "OpenAI (cloud)" },
  ];

  const deepgramModelOptions = [
    { value: "nova-3", label: "Nova 3 (default)" },
    { value: "nova-2", label: "Nova 2" },
    { value: "general", label: "General (legacy)" },
    { value: "general-enhanced", label: "General Enhanced (legacy)" },
  ];

  const usageModeOptions = [
    { value: "own_keys", label: "Use my API keys" },
    { value: "credits", label: "Use account credits" },
  ];

  return (
    <>
      <SettingContainer
        title="Transcription provider"
        description="Choose whether to run transcription locally or send audio to a remote provider."
        descriptionMode="tooltip"
        grouped={grouped}
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Dropdown
            options={providerOptions}
            selectedValue={provider}
            onSelect={handleProviderChange}
            disabled={isUpdating("provider")}
          />
          <Dropdown
            options={usageModeOptions}
            selectedValue={usageMode}
            onSelect={handleUsageModeChange}
            disabled={provider === "local" || isUpdating("usage_mode")}
          />
        </div>
      </SettingContainer>

      <SettingContainer
        title="API base URL"
        description="Remote API endpoint used for Deepgram/OpenAI requests (e.g. https://api.example.com)."
        descriptionMode="tooltip"
        grouped={grouped}
        layout="stacked"
        disabled={!useSecureStorage && !apiBaseUrlInput}
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
          <Input
            className="w-full sm:w-96"
            placeholder="https://api.example.com"
            value={apiBaseUrlInput}
            onChange={(e) => setApiBaseUrlInput(e.target.value)}
            disabled={isUpdating("api_base_url")}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSaveBaseUrl}
            disabled={isUpdating("api_base_url")}
          >
            Save URL
          </Button>
        </div>
      </SettingContainer>

      <SettingContainer
        title="Deepgram API key"
        description="Optional API key used for validation; only a preview is stored locally."
        descriptionMode="tooltip"
        grouped={grouped}
        layout="stacked"
        disabled={provider !== "deepgram"}
        tooltipPosition="bottom"
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
          <Input
            className="w-full sm:w-80"
            placeholder="dg_..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            disabled={provider !== "deepgram" || isUpdating("deepgram_api_key_preview")}
          />
          <Button
            size="sm"
            onClick={handleValidateKey}
            disabled={
              provider !== "deepgram" ||
              isUpdating("deepgram_api_key_preview") ||
              apiKeyInput.trim().length === 0
            }
          >
            Validate & Save
          </Button>
        </div>
        <p className="text-xs text-mid-gray mt-2">
          Saved preview:{" "}
          {settings?.deepgram_api_key_preview
            ? settings.deepgram_api_key_preview
            : "Not set"}
        </p>
      {validationMessage && (
        <p
          className={`text-xs mt-1 ${
            validationState === "error" ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {validationMessage}
        </p>
      )}
    </SettingContainer>

      <SettingContainer
        title="Key storage"
        description="Choose where to keep your API key. Secure storage may prompt once per launch; local storage avoids prompts but is less secure."
        grouped={grouped}
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="key-storage"
              value="secure"
              checked={useSecureStorage}
              onChange={() => setSecureKeyStorage(true)}
            />
            <span className="text-sm">Secure (Keychain/Credential Manager)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="key-storage"
              value="local"
              checked={!useSecureStorage}
              onChange={() => setSecureKeyStorage(false)}
            />
            <span className="text-sm text-amber-600">
              Local (no prompts, less secure)
            </span>
          </label>
        </div>
        <p className="text-xs text-mid-gray mt-1">
          On macOS dev builds you may see a prompt once per launch. Signed releases
          typically prompt only on first use. Switch to local storage to avoid prompts (less secure).
        </p>
      </SettingContainer>

      {provider === "deepgram" && (
        <SettingContainer
          title="Deepgram model"
          description="Choose the model for cloud transcription."
          grouped={grouped}
        >
          <Dropdown
            options={deepgramModelOptions}
            selectedValue={deepgramModel}
            onSelect={(value) => updateSetting("deepgram_model", value as any)}
            disabled={isUpdating("deepgram_model")}
          />
        </SettingContainer>
      )}
    </>
  );
};
