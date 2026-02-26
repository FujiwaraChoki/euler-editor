use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EulerConfig {
    pub compiler: String,
    pub auto_save: bool,
    pub theme: String,
    #[serde(default = "default_ui_font")]
    pub ui_font: String,
    #[serde(default = "default_code_font")]
    pub code_font: String,
    pub debounce_ms: u64,
    #[serde(default)]
    pub vim_mode: bool,
    #[serde(default)]
    pub relative_line_numbers: bool,
    #[serde(default = "default_true")]
    pub show_line_numbers: bool,
    #[serde(default = "default_split_orientation")]
    pub split_orientation: String,
    #[serde(default)]
    pub sidebar_visible: bool,
}

fn default_true() -> bool {
    true
}

fn default_split_orientation() -> String {
    "horizontal".to_string()
}

fn default_ui_font() -> String {
    "Geist".to_string()
}

fn default_code_font() -> String {
    "Geist Mono".to_string()
}

impl Default for EulerConfig {
    fn default() -> Self {
        Self {
            compiler: "pdflatex".to_string(),
            auto_save: true,
            theme: "vercel-dark".to_string(),
            ui_font: default_ui_font(),
            code_font: default_code_font(),
            debounce_ms: 800,
            vim_mode: false,
            relative_line_numbers: false,
            show_line_numbers: true,
            split_orientation: default_split_orientation(),
            sidebar_visible: false,
        }
    }
}
