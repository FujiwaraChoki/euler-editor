use crate::config::EulerConfig;
use crate::error::EulerError;

fn euler_config_path() -> Result<std::path::PathBuf, EulerError> {
    let home = dirs::home_dir().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine home directory",
        ))
    })?;
    Ok(home.join(".euler").join("config.json"))
}

#[tauri::command]
pub async fn get_settings() -> Result<EulerConfig, EulerError> {
    let config_path = euler_config_path()?;

    if !config_path.exists() {
        return Ok(EulerConfig::default());
    }

    let content = tokio::fs::read_to_string(&config_path).await?;
    let config: EulerConfig = serde_json::from_str(&content)?;
    Ok(config)
}

#[tauri::command]
pub async fn save_settings(config: EulerConfig) -> Result<(), EulerError> {
    let config_path = euler_config_path()?;

    if let Some(parent) = config_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let content = serde_json::to_string_pretty(&config)?;
    tokio::fs::write(&config_path, content).await?;
    Ok(())
}
