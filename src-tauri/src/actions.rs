use crate::audio_feedback::{play_feedback_sound, play_feedback_sound_blocking, SoundType};
use crate::audio_toolkit::constants::WHISPER_SAMPLE_RATE;
use crate::managers::audio::AudioRecordingManager;
use crate::managers::history::HistoryManager;
use crate::managers::transcription::TranscriptionManager;
use crate::overlay::{show_recording_overlay, show_transcribing_overlay};
use crate::secure_store;
use crate::settings::{get_settings, AppSettings, TranscriptionProvider, UsageMode};
use crate::tray::{change_tray_icon, TrayIconState};
use crate::utils;
use async_openai::types::{
    ChatCompletionRequestMessage, ChatCompletionRequestUserMessageArgs,
    CreateChatCompletionRequestArgs,
};
use ferrous_opencc::{config::BuiltinConfig, OpenCC};
use base64::Engine;
use log::{debug, error, warn};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Cursor;
use std::sync::Arc;
use std::time::Instant;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;
use reqwest::StatusCode;

// Shortcut Action Trait
pub trait ShortcutAction: Send + Sync {
    fn start(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str);
    fn stop(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str);
}

// Transcribe Action
struct TranscribeAction;

async fn maybe_post_process_transcription(
    settings: &AppSettings,
    transcription: &str,
) -> Option<String> {
    if !settings.post_process_enabled {
        return None;
    }

    let provider = match settings.active_post_process_provider().cloned() {
        Some(provider) => provider,
        None => {
            debug!("Post-processing enabled but no provider is selected");
            return None;
        }
    };

    let model = settings
        .post_process_models
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    if model.trim().is_empty() {
        debug!(
            "Post-processing skipped because provider '{}' has no model configured",
            provider.id
        );
        return None;
    }

    let selected_prompt_id = match &settings.post_process_selected_prompt_id {
        Some(id) => id.clone(),
        None => {
            debug!("Post-processing skipped because no prompt is selected");
            return None;
        }
    };

    let prompt = match settings
        .post_process_prompts
        .iter()
        .find(|prompt| prompt.id == selected_prompt_id)
    {
        Some(prompt) => prompt.prompt.clone(),
        None => {
            debug!(
                "Post-processing skipped because prompt '{}' was not found",
                selected_prompt_id
            );
            return None;
        }
    };

    if prompt.trim().is_empty() {
        debug!("Post-processing skipped because the selected prompt is empty");
        return None;
    }

    let api_key = settings
        .post_process_api_keys
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    debug!(
        "Starting LLM post-processing with provider '{}' (model: {})",
        provider.id, model
    );

    // Replace ${output} variable in the prompt with the actual text
    let processed_prompt = prompt.replace("${output}", transcription);
    debug!("Processed prompt length: {} chars", processed_prompt.len());

    // Create OpenAI-compatible client
    let client = match crate::llm_client::create_client(&provider, api_key) {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create LLM client: {}", e);
            return None;
        }
    };

    // Build the chat completion request
    let message = match ChatCompletionRequestUserMessageArgs::default()
        .content(processed_prompt)
        .build()
    {
        Ok(msg) => ChatCompletionRequestMessage::User(msg),
        Err(e) => {
            error!("Failed to build chat message: {}", e);
            return None;
        }
    };

    let request = match CreateChatCompletionRequestArgs::default()
        .model(&model)
        .messages(vec![message])
        .build()
    {
        Ok(req) => req,
        Err(e) => {
            error!("Failed to build chat completion request: {}", e);
            return None;
        }
    };

    // Send the request
    match client.chat().create(request).await {
        Ok(response) => {
            if let Some(choice) = response.choices.first() {
                if let Some(content) = &choice.message.content {
                    debug!(
                        "LLM post-processing succeeded for provider '{}'. Output length: {} chars",
                        provider.id,
                        content.len()
                    );
                    return Some(content.clone());
                }
            }
            error!("LLM API response has no content");
            None
        }
        Err(e) => {
            error!(
                "LLM post-processing failed for provider '{}': {}. Falling back to original transcription.",
                provider.id,
                e
            );
            None
        }
    }
}

async fn maybe_convert_chinese_variant(
    settings: &AppSettings,
    transcription: &str,
) -> Option<String> {
    // Check if language is set to Simplified or Traditional Chinese
    let is_simplified = settings.selected_language == "zh-Hans";
    let is_traditional = settings.selected_language == "zh-Hant";

    if !is_simplified && !is_traditional {
        debug!("selected_language is not Simplified or Traditional Chinese; skipping translation");
        return None;
    }

    debug!(
        "Starting Chinese translation using OpenCC for language: {}",
        settings.selected_language
    );

    // Use OpenCC to convert based on selected language
    let config = if is_simplified {
        // Convert Traditional Chinese to Simplified Chinese
        BuiltinConfig::Tw2sp
    } else {
        // Convert Simplified Chinese to Traditional Chinese
        BuiltinConfig::S2twp
    };

    match OpenCC::from_config(config) {
        Ok(converter) => {
            let converted = converter.convert(transcription);
            debug!(
                "OpenCC translation completed. Input length: {}, Output length: {}",
                transcription.len(),
                converted.len()
            );
            Some(converted)
        }
        Err(e) => {
            error!("Failed to initialize OpenCC converter: {}. Falling back to original transcription.", e);
            None
        }
    }
}

async fn finalize_transcription(
    settings: &AppSettings,
    transcription: &str,
) -> (String, Option<String>, Option<String>) {
    let mut final_text = transcription.to_string();
    let mut post_processed_text: Option<String> = None;
    let mut post_process_prompt: Option<String> = None;

    if let Some(converted_text) = maybe_convert_chinese_variant(settings, transcription).await {
        final_text = converted_text.clone();
        post_processed_text = Some(converted_text);
    } else if let Some(processed_text) =
        maybe_post_process_transcription(settings, transcription).await
    {
        final_text = processed_text.clone();
        post_processed_text = Some(processed_text);

        if let Some(prompt_id) = &settings.post_process_selected_prompt_id {
            if let Some(prompt) = settings
                .post_process_prompts
                .iter()
                .find(|p| &p.id == prompt_id)
            {
                post_process_prompt = Some(prompt.prompt.clone());
            }
        }
    }

    (final_text, post_processed_text, post_process_prompt)
}

#[derive(Deserialize)]
struct RemoteTranscriptionResponse {
    text: Option<String>,
    success: Option<bool>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeepgramTranscriptionRequest {
    audio_blob: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UnifiedTranscriptionRequest {
    audio: String,
    provider: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
}

fn encode_audio_to_wav_base64(samples: &[f32]) -> Result<String, String> {
    let bytes = encode_audio_to_wav_bytes(samples)?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:audio/wav;base64,{}", encoded))
}

fn encode_audio_to_wav_bytes(samples: &[f32]) -> Result<Vec<u8>, String> {
    let mut cursor = Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: WHISPER_SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    {
        let mut writer = hound::WavWriter::new(&mut cursor, spec)
            .map_err(|e| format!("Failed to create WAV writer: {}", e))?;
        for sample in samples {
            let clamped = (sample * i16::MAX as f32)
                .clamp(i16::MIN as f32, i16::MAX as f32) as i16;
            writer
                .write_sample(clamped)
                .map_err(|e| format!("Failed to write WAV sample: {}", e))?;
        }
        writer
            .finalize()
            .map_err(|e| format!("Failed to finalize WAV buffer: {}", e))?;
    }

    Ok(cursor.into_inner())
}

fn emit_overlay_error(app: &AppHandle, message: &str) {
    if let Some(overlay) = app.get_webview_window("recording_overlay") {
        let _ = overlay.emit("transcription-error", message);
    }
}

async fn transcribe_remote(settings: &AppSettings, samples: &[f32]) -> Result<String, String> {
    let base_url = settings
        .api_base_url
        .as_ref()
        .map(|url| url.trim_end_matches('/'))
        .unwrap_or("");
    let can_use_direct_deepgram =
        settings.provider == TranscriptionProvider::Deepgram && secure_store::fetch_api_key("deepgram").is_some();
    if base_url.is_empty() && !can_use_direct_deepgram {
        return Err(
            "Remote transcription selected but no API base URL is configured in settings"
                .to_string(),
        );
    }

    let audio = encode_audio_to_wav_base64(samples)?;

    let language = if settings.selected_language == "auto" {
        None
    } else {
        Some(settings.selected_language.clone())
    };

    let model = match settings.provider {
        TranscriptionProvider::Deepgram => Some(deepgram_model_from_settings(settings)),
        _ if settings.selected_model.is_empty() => None,
        _ => Some(settings.selected_model.clone()),
    };

    let (endpoint, body, provider_id) = match settings.provider {
        TranscriptionProvider::Local => {
            return Err("Remote transcription requested while provider is set to local".to_string())
        }
        TranscriptionProvider::Deepgram => {
            // If no backend is configured, try direct Deepgram API using the user's key
            if base_url.is_empty() {
                let api_key = if settings.use_secure_key_storage {
                    secure_store::fetch_api_key("deepgram")
                } else {
                    settings
                        .deepgram_api_key
                        .as_ref()
                        .filter(|k| !k.trim().is_empty())
                        .cloned()
                }
                .ok_or_else(|| {
                    "Deepgram provider requires a backend base URL or a stored Deepgram API key"
                        .to_string()
                })?;

                return transcribe_deepgram_direct(
                    samples,
                    api_key,
                    model.clone(),
                    language.clone(),
                )
                .await;
            }

            let api_key = if settings.usage_mode == UsageMode::OwnKeys {
                if settings.use_secure_key_storage {
                    secure_store::fetch_api_key("deepgram")
                } else {
                    settings
                        .deepgram_api_key
                        .as_ref()
                        .filter(|k| !k.trim().is_empty())
                        .cloned()
                }
            } else {
                None
            };

            (
                format!("{}/api/transcribe/deepgram", base_url),
                serde_json::to_value(DeepgramTranscriptionRequest {
                    audio_blob: audio,
                    api_key,
                    model: model.clone(),
                    language,
                })
                .map_err(|e| format!("Failed to serialize Deepgram request: {}", e))?,
                "deepgram".to_string(),
            )
        }
        TranscriptionProvider::Openai => (
            format!("{}/api/transcribe", base_url),
            serde_json::to_value(UnifiedTranscriptionRequest {
                audio,
                provider: "openai".to_string(),
                model,
                language,
            })
            .map_err(|e| format!("Failed to serialize unified request: {}", e))?,
            "openai".to_string(),
        ),
    };

    debug!(
        "Sending remote transcription request to {} for provider '{}'",
        endpoint, provider_id
    );

    let client = reqwest::Client::new();
    let mut builder = client.post(endpoint).json(&body);

    if let Some(token) = settings.auth_token.as_ref() {
        if !token.trim().is_empty() {
            builder = builder.bearer_auth(token.trim());
        }
    }

    let response = builder
        .send()
        .await
        .map_err(|e| format!("Remote transcription request failed: {}", e))?;

    let status = response.status();
    let parsed: RemoteTranscriptionResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse remote transcription response: {}", e))?;

    if parsed.success == Some(false) {
        if let Some(error) = parsed.error {
            return Err(error);
        }
    }

    if !status.is_success() {
        return Err(
            parsed
                .error
                .unwrap_or_else(|| format!("Remote transcription failed with status {}", status)),
        );
    }

    parsed
        .text
        .ok_or_else(|| "Remote transcription returned no text".to_string())
}

fn extract_deepgram_transcript(json: &serde_json::Value) -> Option<String> {
    json.get("results")
        .and_then(|r| r.get("channels"))
        .and_then(|c| c.get(0))
        .and_then(|ch| ch.get("alternatives"))
        .and_then(|alts| alts.get(0))
        .and_then(|alt| alt.get("transcript"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

fn extract_deepgram_duration(json: &serde_json::Value) -> Option<f64> {
    json.get("results")
        .and_then(|r| r.get("channels"))
        .and_then(|c| c.get(0))
        .and_then(|ch| ch.get("alternatives"))
        .and_then(|alts| alts.get(0))
        .and_then(|alt| alt.get("words"))
        .and_then(|words| words.as_array())
        .and_then(|words| words.last())
        .and_then(|word| word.get("end"))
        .and_then(|end| end.as_f64())
}

async fn transcribe_deepgram_direct(
    samples: &[f32],
    api_key: String,
    model: Option<String>,
    language: Option<String>,
) -> Result<String, String> {
    let audio_bytes = encode_audio_to_wav_bytes(samples)?;
    let client = reqwest::Client::new();

    // Prefer provided model; default to nova-3, but fall back to nova-2 on 403
    let primary_model = model.unwrap_or_else(|| "nova-3".to_string());
    let mut models_to_try = vec![primary_model.clone()];
    if primary_model.starts_with("nova-3") {
        models_to_try.push("nova-2".to_string());
    }

    let mut last_error = None;

    for model_name in models_to_try {
        let mut url = reqwest::Url::parse("https://api.deepgram.com/v1/listen")
            .map_err(|e| format!("Failed to parse Deepgram URL: {}", e))?;
        {
            let mut pairs = url.query_pairs_mut();
            pairs.append_pair("smart_format", "true");
            if let Some(lang) = language.as_ref() {
                pairs.append_pair("language", lang);
            }
            pairs.append_pair("model", &model_name);
        }

        let response = client
            .post(url.clone())
            .header("Authorization", format!("Token {}", api_key))
            .header("Content-Type", "audio/wav")
            .body(audio_bytes.clone())
            .send()
            .await
            .map_err(|e| format!("Deepgram request failed: {}", e))?;

        let status = response.status();
        let text_body = response
            .text()
            .await
            .map_err(|e| format!("Failed to read Deepgram response: {}", e))?;

        let json: serde_json::Value = serde_json::from_str(&text_body)
            .map_err(|e| format!("Failed to parse Deepgram response JSON: {}", e))?;

        if status.is_success() {
            let transcript = extract_deepgram_transcript(&json)
                .ok_or_else(|| "Deepgram response missing transcript".to_string())?;

            debug!(
                "Deepgram direct transcript length: {}, duration: {:?} (model: {})",
                transcript.len(),
                extract_deepgram_duration(&json),
                model_name
            );

            return Ok(transcript);
        }

        let err_msg = json
            .get("err_msg")
            .or_else(|| json.get("error"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Deepgram error")
            .to_string();

        if status == StatusCode::FORBIDDEN && model_name.starts_with("nova-3") {
            warn!(
                "Deepgram denied access to model '{}', retrying with nova-2",
                model_name
            );
            last_error = Some(format!(
                "Deepgram transcription failed ({}): {}",
                status, err_msg
            ));
            continue;
        } else {
            return Err(format!(
                "Deepgram transcription failed ({}): {}",
                status, err_msg
            ));
        }
    }

    Err(last_error.unwrap_or_else(|| "Deepgram transcription failed".to_string()))
}

fn deepgram_model_from_settings(settings: &AppSettings) -> String {
    let selected = settings.deepgram_model.trim();
    if selected.is_empty() {
        return "nova-3".to_string();
    }
    let lowered = selected.to_lowercase();

    if lowered.starts_with("nova") || lowered.starts_with("general") {
        selected.to_string()
    } else {
        warn!(
            "Selected model '{}' is not a Deepgram model; defaulting to nova-3",
            selected
        );
        "nova-3".to_string()
    }
}

impl ShortcutAction for TranscribeAction {
    fn start(&self, app: &AppHandle, binding_id: &str, _shortcut_str: &str) {
        let start_time = Instant::now();
        debug!("TranscribeAction::start called for binding: {}", binding_id);

        let tm = app.state::<Arc<TranscriptionManager>>();
        let settings = get_settings(app);

        // Load model in the background only for local provider
        if settings.provider == TranscriptionProvider::Local {
            tm.initiate_model_load();
        } else {
            debug!(
                "Skipping local model preload because provider is {:?}",
                settings.provider
            );
        }

        let binding_id = binding_id.to_string();
        change_tray_icon(app, TrayIconState::Recording);
        show_recording_overlay(app);

        let rm = app.state::<Arc<AudioRecordingManager>>();

        // Get the microphone mode to determine audio feedback timing
        let is_always_on = settings.always_on_microphone;
        debug!("Microphone mode - always_on: {}", is_always_on);

        if is_always_on {
            // Always-on mode: Play audio feedback immediately, then apply mute after sound finishes
            debug!("Always-on mode: Playing audio feedback immediately");
            let rm_clone = Arc::clone(&rm);
            let app_clone = app.clone();
            // The blocking helper exits immediately if audio feedback is disabled,
            // so we can always reuse this thread to ensure mute happens right after playback.
            std::thread::spawn(move || {
                play_feedback_sound_blocking(&app_clone, SoundType::Start);
                rm_clone.apply_mute();
            });

            let recording_started = rm.try_start_recording(&binding_id);
            debug!("Recording started: {}", recording_started);
        } else {
            // On-demand mode: Start recording first, then play audio feedback, then apply mute
            // This allows the microphone to be activated before playing the sound
            debug!("On-demand mode: Starting recording first, then audio feedback");
            let recording_start_time = Instant::now();
            if rm.try_start_recording(&binding_id) {
                debug!("Recording started in {:?}", recording_start_time.elapsed());
                // Small delay to ensure microphone stream is active
                let app_clone = app.clone();
                let rm_clone = Arc::clone(&rm);
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    debug!("Handling delayed audio feedback/mute sequence");
                    // Helper handles disabled audio feedback by returning early, so we reuse it
                    // to keep mute sequencing consistent in every mode.
                    play_feedback_sound_blocking(&app_clone, SoundType::Start);
                    rm_clone.apply_mute();
                });
            } else {
                debug!("Failed to start recording");
            }
        }

        debug!(
            "TranscribeAction::start completed in {:?}",
            start_time.elapsed()
        );
    }

    fn stop(&self, app: &AppHandle, binding_id: &str, _shortcut_str: &str) {
        let stop_time = Instant::now();
        debug!("TranscribeAction::stop called for binding: {}", binding_id);

        let ah = app.clone();
        let rm = Arc::clone(&app.state::<Arc<AudioRecordingManager>>());
        let tm = Arc::clone(&app.state::<Arc<TranscriptionManager>>());
        let hm = Arc::clone(&app.state::<Arc<HistoryManager>>());

        change_tray_icon(app, TrayIconState::Transcribing);
        show_transcribing_overlay(app);

        // Unmute before playing audio feedback so the stop sound is audible
        rm.remove_mute();

        // Play audio feedback for recording stop
        play_feedback_sound(app, SoundType::Stop);

        let binding_id = binding_id.to_string(); // Clone binding_id for the async task

        tauri::async_runtime::spawn(async move {
            let binding_id = binding_id.clone(); // Clone for the inner async task
            debug!(
                "Starting async transcription task for binding: {}",
                binding_id
            );

            let stop_recording_time = Instant::now();
            if let Some(samples) = rm.stop_recording(&binding_id) {
                debug!(
                    "Recording stopped and samples retrieved in {:?}, sample count: {}",
                    stop_recording_time.elapsed(),
                    samples.len()
                );

                let transcription_time = Instant::now();
                let samples_for_history = samples.clone();
                let settings = get_settings(&ah);
                let provider = settings.provider;

                let transcription_result = if provider == TranscriptionProvider::Local {
                    tm.transcribe(samples).map_err(|e| e.to_string())
                } else {
                    transcribe_remote(&settings, &samples_for_history).await
                };

                match transcription_result {
                    Ok(transcription) => {
                        debug!(
                            "Transcription completed via {:?} in {:?} ({} chars)",
                            provider,
                            transcription_time.elapsed(),
                            transcription.len()
                        );

                        let (final_text, post_processed_text, post_process_prompt) =
                            finalize_transcription(&settings, &transcription).await;

                        if final_text.trim().is_empty() {
                            utils::hide_recording_overlay(&ah);
                            change_tray_icon(&ah, TrayIconState::Idle);
                            return;
                        }

                        // Save to history with post-processed text and prompt
                        let hm_clone = Arc::clone(&hm);
                        let transcription_for_history = transcription.clone();
                        let post_processed_for_history = post_processed_text.clone();
                        let post_process_prompt_for_history = post_process_prompt.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = hm_clone
                                .save_transcription(
                                    samples_for_history,
                                    transcription_for_history,
                                    post_processed_for_history,
                                    post_process_prompt_for_history,
                                )
                                .await
                            {
                                error!("Failed to save transcription to history: {}", e);
                            }
                        });

                        // Paste the final text (either processed or original)
                        let ah_clone = ah.clone();
                        let paste_time = Instant::now();
                        ah.run_on_main_thread(move || {
                            match utils::paste(final_text.clone(), ah_clone.clone()) {
                                Ok(()) => debug!(
                                    "Text pasted successfully in {:?}",
                                    paste_time.elapsed()
                                ),
                                Err(e) => error!("Failed to paste transcription: {}", e),
                            }
                            // Hide the overlay after transcription is complete
                            utils::hide_recording_overlay(&ah_clone);
                            change_tray_icon(&ah_clone, TrayIconState::Idle);
                        })
                        .unwrap_or_else(|e| {
                            error!("Failed to run paste on main thread: {:?}", e);
                            utils::hide_recording_overlay(&ah);
                            change_tray_icon(&ah, TrayIconState::Idle);
                        });
                    }
                    Err(err) => {
                        warn!("Transcription failed via {:?}: {}", provider, err);
                        emit_overlay_error(&ah, &err);
                        utils::hide_recording_overlay(&ah);
                        change_tray_icon(&ah, TrayIconState::Idle);
                    }
                }
            } else {
                debug!("No samples retrieved from recording stop");
                emit_overlay_error(&ah, "No audio captured");
                utils::hide_recording_overlay(&ah);
                change_tray_icon(&ah, TrayIconState::Idle);
            }
        });

        debug!(
            "TranscribeAction::stop completed in {:?}",
            stop_time.elapsed()
        );
    }
}

// Test Action
struct TestAction;

impl ShortcutAction for TestAction {
    fn start(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str) {
        log::info!(
            "Shortcut ID '{}': Started - {} (App: {})", // Changed "Pressed" to "Started" for consistency
            binding_id,
            shortcut_str,
            app.package_info().name
        );
    }

    fn stop(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str) {
        log::info!(
            "Shortcut ID '{}': Stopped - {} (App: {})", // Changed "Released" to "Stopped" for consistency
            binding_id,
            shortcut_str,
            app.package_info().name
        );
    }
}

// Static Action Map
pub static ACTION_MAP: Lazy<HashMap<String, Arc<dyn ShortcutAction>>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert(
        "transcribe".to_string(),
        Arc::new(TranscribeAction) as Arc<dyn ShortcutAction>,
    );
    map.insert(
        "test".to_string(),
        Arc::new(TestAction) as Arc<dyn ShortcutAction>,
    );
    map
});
