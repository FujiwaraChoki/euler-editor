use crate::error::EulerError;
use std::path::Path;

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, EulerError> {
    let content = tokio::fs::read_to_string(&path).await?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), EulerError> {
    tokio::fs::write(&path, &content).await?;
    Ok(())
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub async fn create_file(path: String, content: String) -> Result<(), EulerError> {
    if let Some(parent) = Path::new(&path).parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&path, &content).await?;
    Ok(())
}
