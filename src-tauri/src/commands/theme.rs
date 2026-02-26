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
        "name": "vercel-dark",
        "displayName": "Vercel Dark",
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

pub fn vercel_light_theme() -> serde_json::Value {
    serde_json::json!({
        "name": "vercel-light",
        "displayName": "Vercel Light",
        "colors": {
            "bgPrimary": "#e5e5e5",
            "bgSecondary": "#f4f4f5",
            "bgTertiary": "#d9d9d9",
            "border": "#d9d9d9",
            "textPrimary": "#09090b",
            "textSecondary": "#666666",
            "textMuted": "#a3a3a3",
            "accent": "#0068d6",
            "error": "#bd2864",
            "success": "#16a34a",
            "warning": "#e16009"
        }
    })
}

pub fn catppuccin_latte_theme() -> serde_json::Value {
    serde_json::json!({
        "name": "catppuccin-latte",
        "displayName": "Catppuccin Latte",
        "colors": {
            "bgPrimary": "#eff1f5",
            "bgSecondary": "#e6e9ef",
            "bgTertiary": "#ccd0da",
            "border": "#bcc0cc",
            "textPrimary": "#4c4f69",
            "textSecondary": "#5c5f77",
            "textMuted": "#8c8fa1",
            "accent": "#7287fd",
            "error": "#d20f39",
            "success": "#40a02b",
            "warning": "#df8e1d"
        }
    })
}

pub fn catppuccin_frappe_theme() -> serde_json::Value {
    serde_json::json!({
        "name": "catppuccin-frappe",
        "displayName": "Catppuccin Frappé",
        "colors": {
            "bgPrimary": "#303446",
            "bgSecondary": "#292c3c",
            "bgTertiary": "#414559",
            "border": "#51576d",
            "textPrimary": "#c6d0f5",
            "textSecondary": "#b5bfe2",
            "textMuted": "#838ba7",
            "accent": "#babbf1",
            "error": "#e78284",
            "success": "#a6d189",
            "warning": "#e5c890"
        }
    })
}

pub fn catppuccin_macchiato_theme() -> serde_json::Value {
    serde_json::json!({
        "name": "catppuccin-macchiato",
        "displayName": "Catppuccin Macchiato",
        "colors": {
            "bgPrimary": "#24273a",
            "bgSecondary": "#1e2030",
            "bgTertiary": "#363a4f",
            "border": "#494d64",
            "textPrimary": "#cad3f5",
            "textSecondary": "#b8c0e0",
            "textMuted": "#8087a2",
            "accent": "#b7bdf8",
            "error": "#ed8796",
            "success": "#a6da95",
            "warning": "#eed49f"
        }
    })
}

pub fn catppuccin_mocha_theme() -> serde_json::Value {
    serde_json::json!({
        "name": "catppuccin-mocha",
        "displayName": "Catppuccin Mocha",
        "colors": {
            "bgPrimary": "#1e1e2e",
            "bgSecondary": "#181825",
            "bgTertiary": "#313244",
            "border": "#45475a",
            "textPrimary": "#cdd6f4",
            "textSecondary": "#bac2de",
            "textMuted": "#7f849c",
            "accent": "#b4befe",
            "error": "#f38ba8",
            "success": "#a6e3a1",
            "warning": "#f9e2af"
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
