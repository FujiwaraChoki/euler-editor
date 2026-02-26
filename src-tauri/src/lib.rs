mod commands;
mod compiler;
mod config;
mod error;

use commands::compile::compile_latex;
use commands::file_ops::{create_file, file_exists, read_file, write_file};
use commands::settings::{get_settings, save_settings};
use commands::theme::{default_dark_theme, get_theme, get_themes, save_theme};
use config::EulerConfig;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            compile_latex,
            read_file,
            write_file,
            file_exists,
            create_file,
            get_settings,
            save_settings,
            get_themes,
            get_theme,
            save_theme,
        ])
        .setup(|_app| {
            let home = dirs::home_dir().expect("Could not determine home directory");
            let euler_dir = home.join(".euler");
            let themes_dir = euler_dir.join("themes");
            let tmp_dir = euler_dir.join("tmp");

            // Create directories
            std::fs::create_dir_all(&euler_dir).expect("Failed to create ~/.euler/");
            std::fs::create_dir_all(&themes_dir).expect("Failed to create ~/.euler/themes/");
            std::fs::create_dir_all(&tmp_dir).expect("Failed to create ~/.euler/tmp/");

            // Write default config if it doesn't exist
            let config_path = euler_dir.join("config.json");
            if !config_path.exists() {
                let default_config = EulerConfig::default();
                let config_json = serde_json::to_string_pretty(&default_config)
                    .expect("Failed to serialize default config");
                std::fs::write(&config_path, config_json)
                    .expect("Failed to write default config");
            }

            // Write default dark theme if it doesn't exist
            let default_theme_path = themes_dir.join("default-dark.json");
            if !default_theme_path.exists() {
                let theme = default_dark_theme();
                let theme_json = serde_json::to_string_pretty(&theme)
                    .expect("Failed to serialize default dark theme");
                std::fs::write(&default_theme_path, theme_json)
                    .expect("Failed to write default dark theme");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
