use crate::compiler::{compile_tex, CompileResult};
use crate::error::EulerError;
use std::path::PathBuf;

#[tauri::command]
pub async fn compile_latex(
    content: String,
    file_stem: String,
    compiler: String,
    file_path: Option<String>,
) -> Result<CompileResult, EulerError> {
    let home = dirs::home_dir().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine home directory",
        ))
    })?;

    let tmp_dir = home.join(".euler").join("tmp");
    tokio::fs::create_dir_all(&tmp_dir).await?;

    // Use the opened file's parent directory as the working directory
    // so that \input, \includegraphics, etc. resolve relative paths correctly.
    let working_dir = file_path
        .map(|p| PathBuf::from(p))
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    compile_tex(&content, &file_stem, &compiler, &tmp_dir, working_dir.as_deref()).await
}
