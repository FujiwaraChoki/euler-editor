mod commands;
mod compiler;
mod config;
mod error;

use commands::cli::install_cli;
use commands::compile::compile_latex;
use commands::file_ops::{create_file, file_exists, read_file, write_file};
use commands::fonts::get_system_fonts;
use commands::settings::{get_settings, save_settings};
use commands::theme::{
    catppuccin_frappe_theme, catppuccin_latte_theme, catppuccin_macchiato_theme,
    catppuccin_mocha_theme, default_dark_theme, get_theme, get_themes, save_theme,
    vercel_light_theme,
};
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
            get_system_fonts,
            get_themes,
            get_theme,
            save_theme,
            install_cli,
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

            // Migrate old default-dark.json to vercel-dark.json
            let old_theme_path = themes_dir.join("default-dark.json");
            if old_theme_path.exists() {
                let _ = std::fs::remove_file(&old_theme_path);
            }

            // Write Vercel Dark theme if it doesn't exist
            let dark_theme_path = themes_dir.join("vercel-dark.json");
            if !dark_theme_path.exists() {
                let theme = default_dark_theme();
                let theme_json = serde_json::to_string_pretty(&theme)
                    .expect("Failed to serialize Vercel Dark theme");
                std::fs::write(&dark_theme_path, theme_json)
                    .expect("Failed to write Vercel Dark theme");
            }

            // Write Vercel Light theme if it doesn't exist
            let light_theme_path = themes_dir.join("vercel-light.json");
            if !light_theme_path.exists() {
                let theme = vercel_light_theme();
                let theme_json = serde_json::to_string_pretty(&theme)
                    .expect("Failed to serialize Vercel Light theme");
                std::fs::write(&light_theme_path, theme_json)
                    .expect("Failed to write Vercel Light theme");
            }

            // Write Catppuccin themes if they don't exist
            let catppuccin_themes: Vec<(&str, serde_json::Value)> = vec![
                ("catppuccin-latte", catppuccin_latte_theme()),
                ("catppuccin-frappe", catppuccin_frappe_theme()),
                ("catppuccin-macchiato", catppuccin_macchiato_theme()),
                ("catppuccin-mocha", catppuccin_mocha_theme()),
            ];

            for (name, theme) in catppuccin_themes {
                let path = themes_dir.join(format!("{}.json", name));
                if !path.exists() {
                    let json = serde_json::to_string_pretty(&theme)
                        .unwrap_or_else(|_| panic!("Failed to serialize {} theme", name));
                    std::fs::write(&path, json)
                        .unwrap_or_else(|_| panic!("Failed to write {} theme", name));
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
