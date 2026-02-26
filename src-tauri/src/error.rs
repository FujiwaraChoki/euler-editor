use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum EulerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Compilation failed: {0}")]
    CompilationFailed(String),
    #[error("Compiler not found: {0}")]
    CompilerNotFound(String),
}

impl Serialize for EulerError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
