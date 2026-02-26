use crate::compiler::{compile_tex, CompileResult};
use crate::error::EulerError;

#[tauri::command]
pub async fn compile_latex(
    content: String,
    file_stem: String,
    compiler: String,
) -> Result<CompileResult, EulerError> {
    let home = dirs::home_dir().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine home directory",
        ))
    })?;

    let tmp_dir = home.join(".euler").join("tmp");
    tokio::fs::create_dir_all(&tmp_dir).await?;

    compile_tex(&content, &file_stem, &compiler, &tmp_dir).await
}
