use crate::error::EulerError;

fn euler_themes_dir() -> Result<std::path::PathBuf, EulerError> {
    let home = dirs::home_dir().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine home directory",
        ))
    })?;
    Ok(home.join(".euler").join("themes"))
}

pub fn default_dark_theme() -> serde_json::Value {
    serde_json::json!({
        "name": "default-dark",
        "displayName": "Default Dark",
        "colors": {
            "bgPrimary": "#0a0a0a",
            "bgSecondary": "#111111",
            "bgTertiary": "#1a1a1a",
            "border": "#2e2e2e",
            "textPrimary": "#ededed",
            "textSecondary": "#a1a1a1",
            "textMuted": "#666666",
            "accent": "#ffffff",
            "error": "#ff6369",
            "success": "#50e3c2",
            "warning": "#f5a623"
        }
    })
}

#[tauri::command]
pub async fn get_themes() -> Result<Vec<serde_json::Value>, EulerError> {
    let themes_dir = euler_themes_dir()?;

    if !themes_dir.exists() {
        return Ok(vec![]);
    }

    let mut themes = Vec::new();
    let mut entries = tokio::fs::read_dir(&themes_dir).await?;

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            let content = tokio::fs::read_to_string(&path).await?;
            if let Ok(theme) = serde_json::from_str::<serde_json::Value>(&content) {
                themes.push(theme);
            }
        }
    }

    Ok(themes)
}

#[tauri::command]
pub async fn get_theme(name: String) -> Result<serde_json::Value, EulerError> {
    let themes_dir = euler_themes_dir()?;
    let theme_path = themes_dir.join(format!("{}.json", name));

    let content = tokio::fs::read_to_string(&theme_path).await?;
    let theme: serde_json::Value = serde_json::from_str(&content)?;
    Ok(theme)
}

#[tauri::command]
pub async fn save_theme(name: String, theme: serde_json::Value) -> Result<(), EulerError> {
    let themes_dir = euler_themes_dir()?;
    tokio::fs::create_dir_all(&themes_dir).await?;

    let theme_path = themes_dir.join(format!("{}.json", name));
    let content = serde_json::to_string_pretty(&theme)?;
    tokio::fs::write(&theme_path, content).await?;
    Ok(())
}
