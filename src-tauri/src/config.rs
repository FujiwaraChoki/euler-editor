use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EulerConfig {
    pub compiler: String,
    pub auto_save: bool,
    pub theme: String,
    pub debounce_ms: u64,
    #[serde(default)]
    pub vim_mode: bool,
}

impl Default for EulerConfig {
    fn default() -> Self {
        Self {
            compiler: "pdflatex".to_string(),
            auto_save: true,
            theme: "default-dark".to_string(),
            debounce_ms: 800,
            vim_mode: false,
        }
    }
}
