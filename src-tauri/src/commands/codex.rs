use crate::error::EulerError;
use serde::Serialize;
use std::env;
use std::path::{Path, PathBuf};
use std::time::Instant;
use tempfile::NamedTempFile;
use tokio::process::Command;

const CODEX_BINARY: &str = "codex";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexStatus {
    pub available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexEditResult {
    pub assistant_message: String,
    pub command_output: String,
    pub edited_file_path: String,
    pub elapsed_ms: u128,
}

#[tauri::command]
pub async fn get_codex_status() -> Result<CodexStatus, EulerError> {
    let path = find_binary_in_path(CODEX_BINARY);

    let Some(binary_path) = path else {
        return Ok(CodexStatus {
            available: false,
            path: None,
            version: None,
            detail: Some("Install the Codex CLI to enable AI edits inside Euler.".to_string()),
        });
    };

    let output = Command::new(&binary_path).arg("--version").output().await?;
    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(CodexStatus {
            available: true,
            path: Some(binary_path.to_string_lossy().into_owned()),
            version: Some(version),
            detail: Some("Codex can edit the current LaTeX file in place.".to_string()),
        })
    } else {
        Ok(CodexStatus {
            available: false,
            path: Some(binary_path.to_string_lossy().into_owned()),
            version: None,
            detail: Some(trimmed_output(&output.stdout, &output.stderr)),
        })
    }
}

#[tauri::command]
pub async fn apply_codex_edit(prompt: String, file_path: String) -> Result<CodexEditResult, EulerError> {
    let prompt = prompt.trim();
    if prompt.is_empty() {
        return Err(EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Please enter a prompt for Codex.",
        )));
    }

    let target_path = PathBuf::from(&file_path);
    if !target_path.exists() {
        return Err(EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("File not found: {}", file_path),
        )));
    }

    let workdir = target_path.parent().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Could not determine a working directory for {}", file_path),
        ))
    })?;

    let codex_binary = find_binary_in_path(CODEX_BINARY).ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Codex CLI was not found in PATH.",
        ))
    })?;

    let output_file = NamedTempFile::new()?;
    let output_file_path = output_file.path().to_path_buf();
    drop(output_file);

    let mut command = Command::new(codex_binary);
    command
        .arg("exec")
        .arg("--ephemeral")
        .arg("--skip-git-repo-check")
        .arg("--sandbox")
        .arg("workspace-write")
        .arg("--color")
        .arg("never")
        .arg("-C")
        .arg(workdir)
        .arg("-o")
        .arg(&output_file_path)
        .arg(build_codex_prompt(&target_path, prompt));

    let started_at = Instant::now();
    let output = command.output().await?;
    let elapsed_ms = started_at.elapsed().as_millis();

    let assistant_message = tokio::fs::read_to_string(&output_file_path)
        .await
        .unwrap_or_default()
        .trim()
        .to_string();
    let command_output = trimmed_output(&output.stdout, &output.stderr);

    let _ = tokio::fs::remove_file(&output_file_path).await;

    if !output.status.success() {
        return Err(EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            if command_output.is_empty() {
                "Codex did not finish successfully.".to_string()
            } else {
                format!("Codex edit failed: {}", command_output)
            },
        )));
    }

    Ok(CodexEditResult {
        assistant_message,
        command_output,
        edited_file_path: file_path,
        elapsed_ms,
    })
}

fn build_codex_prompt(target_path: &Path, user_prompt: &str) -> String {
    let target_name = target_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.tex");

    format!(
        "You are editing a LaTeX document inside Euler.\n\
Edit only the file \"{target_name}\" in the current working directory.\n\
Rules:\n\
- Apply the user's request directly to that file.\n\
- Keep the document valid LaTeX unless the user explicitly asks otherwise.\n\
- Preserve the existing structure and style where possible.\n\
- Do not create, rename, or modify any other files.\n\
- After editing, stop and summarize the changes briefly.\n\n\
User request:\n{user_prompt}"
    )
}

fn trimmed_output(stdout: &[u8], stderr: &[u8]) -> String {
    let stdout = String::from_utf8_lossy(stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(stderr).trim().to_string();

    match (stdout.is_empty(), stderr.is_empty()) {
        (false, false) => format!("{stdout}\n{stderr}"),
        (false, true) => stdout,
        (true, false) => stderr,
        (true, true) => String::new(),
    }
}

fn find_binary_in_path(binary_name: &str) -> Option<PathBuf> {
    let path = env::var_os("PATH")?;
    for directory in env::split_paths(&path) {
        let candidate = directory.join(binary_name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}
