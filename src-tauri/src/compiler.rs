use base64::Engine;
use serde::Serialize;
use std::path::Path;
use tokio::process::Command;

use crate::error::EulerError;

#[derive(Debug, Clone, Serialize)]
pub struct CompileResult {
    pub success: bool,
    pub pdf_base64: Option<String>,
    pub log: String,
    pub errors: Vec<String>,
}

pub async fn compile_tex(
    content: &str,
    file_stem: &str,
    compiler: &str,
    tmp_dir: &Path,
) -> Result<CompileResult, EulerError> {
    // Validate compiler name
    let valid_compilers = ["pdflatex", "xelatex", "lualatex"];
    if !valid_compilers.contains(&compiler) {
        return Err(EulerError::CompilerNotFound(format!(
            "Unknown compiler '{}'. Supported: pdflatex, xelatex, lualatex",
            compiler
        )));
    }

    // Write the .tex file to the tmp directory
    let tex_path = tmp_dir.join(format!("{}.tex", file_stem));
    tokio::fs::write(&tex_path, content).await?;

    // Spawn the compiler process
    let output = Command::new(compiler)
        .arg("-interaction=nonstopmode")
        .arg("-halt-on-error")
        .arg(format!("-output-directory={}", tmp_dir.display()))
        .arg(&tex_path)
        .output()
        .await
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                EulerError::CompilerNotFound(format!(
                    "Compiler '{}' not found on system. Please install it.",
                    compiler
                ))
            } else {
                EulerError::Io(e)
            }
        })?;

    let log = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let full_log = if stderr.is_empty() {
        log.clone()
    } else {
        format!("{}\n{}", log, stderr)
    };

    // Parse errors from the log (lines starting with "!")
    let errors: Vec<String> = full_log
        .lines()
        .filter(|line| line.starts_with('!'))
        .map(|line| line.to_string())
        .collect();

    let success = output.status.success();

    // Try to read the generated PDF
    let pdf_base64 = if success {
        let pdf_path = tmp_dir.join(format!("{}.pdf", file_stem));
        match tokio::fs::read(&pdf_path).await {
            Ok(pdf_bytes) => {
                let encoded = base64::engine::general_purpose::STANDARD.encode(&pdf_bytes);
                Some(encoded)
            }
            Err(_) => None,
        }
    } else {
        None
    };

    Ok(CompileResult {
        success,
        pdf_base64,
        log: full_log,
        errors,
    })
}
