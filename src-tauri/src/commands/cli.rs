use crate::error::EulerError;
use std::path::Path;

#[tauri::command]
pub fn install_cli() -> Result<String, EulerError> {
    let exe_path = std::env::current_exe().map_err(|e| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Could not determine binary path: {}", e),
        ))
    })?;

    let target = "/usr/local/bin/euler";
    let exe_str = exe_path.to_string_lossy();

    // Check if symlink already exists and points to the correct binary
    let target_path = Path::new(target);
    if target_path.is_symlink() {
        if let Ok(existing) = std::fs::read_link(target_path) {
            if existing == exe_path {
                return Ok("CLI is already installed and up to date.".to_string());
            }
        }
    }

    // Use osascript to get admin privileges and create the symlink
    let script = format!(
        "do shell script \"ln -sf '{}' '{}'\" with administrator privileges",
        exe_str, target
    );

    let output = std::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| {
            EulerError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to run osascript: {}", e),
            ))
        })?;

    if output.status.success() {
        Ok(format!(
            "CLI installed successfully. You can now run 'euler' from the terminal."
        ))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("User canceled") || stderr.contains("(-128)") {
            Err(EulerError::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Installation cancelled by user.",
            )))
        } else {
            Err(EulerError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to install CLI: {}", stderr.trim()),
            )))
        }
    }
}
