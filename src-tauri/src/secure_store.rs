use std::collections::HashMap;
use std::sync::Mutex;

use keyring::Entry;
use log::{debug, warn};
use once_cell::sync::Lazy;

const SERVICE_NAME: &str = "handy_voice";

// Cache decrypted secrets in memory for the app session to avoid repeated Keychain prompts.
static KEY_CACHE: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub fn store_api_key(provider: &str, key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, provider)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .set_password(key)
        .map_err(|e| format!("Failed to store API key: {}", e))?;
    if let Ok(mut cache) = KEY_CACHE.lock() {
        cache.insert(provider.to_string(), key.to_string());
    }
    debug!("Stored API key in keyring for provider '{}'", provider);
    Ok(())
}

pub fn fetch_api_key(provider: &str) -> Option<String> {
    if let Ok(cache) = KEY_CACHE.lock() {
        if let Some(value) = cache.get(provider) {
            return Some(value.clone());
        }
    }

    match Entry::new(SERVICE_NAME, provider) {
        Ok(entry) => match entry.get_password() {
            Ok(value) => Some(value),
            Err(err) => {
                warn!(
                    "Failed to read API key from keyring for provider '{}': {}",
                    provider, err
                );
                None
            }
        },
        Err(err) => {
            warn!(
                "Failed to create keyring entry for provider '{}': {}",
                provider, err
            );
            None
        }
    }
}

pub fn delete_api_key(provider: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, provider)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .delete_password()
        .map_err(|e| format!("Failed to delete API key: {}", e))?;
    if let Ok(mut cache) = KEY_CACHE.lock() {
        cache.remove(provider);
    }
    debug!("Deleted API key from keyring for provider '{}'", provider);
    Ok(())
}
