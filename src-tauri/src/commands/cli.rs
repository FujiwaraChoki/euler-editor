use crate::error::EulerError;
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

const COMMAND_NAME: &str = "euler";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliIntegrationStatus {
    pub installed: bool,
    pub needs_update: bool,
    pub has_conflict: bool,
    pub install_path: String,
    pub discovered_path: Option<String>,
    pub linked_path: Option<String>,
    pub source_path: String,
    pub requires_elevation: bool,
}

#[derive(Debug, Clone)]
struct CliInstallTarget {
    path: PathBuf,
    requires_elevation: bool,
}

#[tauri::command]
pub fn get_cli_status() -> Result<CliIntegrationStatus, EulerError> {
    build_cli_status()
}

#[tauri::command]
pub fn install_cli() -> Result<CliIntegrationStatus, EulerError> {
    let status = build_cli_status()?;
    if status.installed && !status.needs_update {
        return Ok(status);
    }

    if status.has_conflict {
        let conflict_path = status
            .discovered_path
            .unwrap_or_else(|| status.install_path.clone());
        return Err(EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::AlreadyExists,
            format!(
                "Another '{}' command already exists at {}. Remove or rename it before installing Euler's CLI helper.",
                COMMAND_NAME, conflict_path
            ),
        )));
    }

    let source_path = current_binary_path()?;
    let target = resolve_install_target()?;

    if target.requires_elevation {
        install_link_with_elevation(&source_path, &target.path)?;
    } else {
        install_link_without_elevation(&source_path, &target.path)?;
    }

    build_cli_status()
}

fn build_cli_status() -> Result<CliIntegrationStatus, EulerError> {
    let source_path = current_binary_path()?;
    let target = resolve_install_target()?;
    let discovered_path = discover_existing_command()?;
    let linked_path = discovered_path
        .as_ref()
        .and_then(|path| std::fs::read_link(path).ok());

    let installed = discovered_path
        .as_ref()
        .map(|path| same_command(path, &source_path))
        .unwrap_or(false);

    let has_conflict = discovered_path
        .as_ref()
        .map(|path| {
            std::fs::symlink_metadata(path)
                .map(|metadata| !metadata.file_type().is_symlink() && !same_command(path, &source_path))
                .unwrap_or(false)
        })
        .unwrap_or(false);

    Ok(CliIntegrationStatus {
        installed,
        needs_update: discovered_path.is_some() && !installed && !has_conflict,
        has_conflict,
        install_path: target.path.to_string_lossy().into_owned(),
        discovered_path: discovered_path.map(|path| path.to_string_lossy().into_owned()),
        linked_path: linked_path.map(|path| path.to_string_lossy().into_owned()),
        source_path: source_path.to_string_lossy().into_owned(),
        requires_elevation: target.requires_elevation,
    })
}

fn resolve_install_target() -> Result<CliInstallTarget, EulerError> {
    let home_dir = home_dir_path()?;

    if let Some(existing_path) = discover_existing_command()? {
        return Ok(CliInstallTarget {
            requires_elevation: !existing_path.starts_with(&home_dir),
            path: existing_path,
        });
    }

    let preferred_dir = preferred_install_dir(&home_dir);
    Ok(CliInstallTarget {
        requires_elevation: !preferred_dir.starts_with(&home_dir),
        path: preferred_dir.join(COMMAND_NAME),
    })
}

fn preferred_install_dir(home_dir: &Path) -> PathBuf {
    let path_dirs = shell_path_dirs();
    let local_bin = home_dir.join(".local/bin");
    if path_dirs.iter().any(|dir| dir == &local_bin) {
        return local_bin;
    }

    let user_bin = home_dir.join("bin");
    if path_dirs.iter().any(|dir| dir == &user_bin) {
        return user_bin;
    }

    let homebrew_bin = PathBuf::from("/opt/homebrew/bin");
    if homebrew_bin.exists() {
        return homebrew_bin;
    }

    PathBuf::from("/usr/local/bin")
}

fn discover_existing_command() -> Result<Option<PathBuf>, EulerError> {
    let home_dir = home_dir_path()?;
    let search_dirs = search_dirs(&home_dir);

    Ok(search_dirs
        .into_iter()
        .map(|dir| dir.join(COMMAND_NAME))
        .find(|candidate| std::fs::symlink_metadata(candidate).is_ok()))
}

fn search_dirs(home_dir: &Path) -> Vec<PathBuf> {
    let path_dirs = shell_path_dirs();
    let mut dirs = Vec::new();
    let mut seen = HashSet::new();

    let local_bin = home_dir.join(".local/bin");
    push_unique_if_relevant(&mut dirs, &mut seen, &local_bin, &path_dirs);

    let user_bin = home_dir.join("bin");
    push_unique_if_relevant(&mut dirs, &mut seen, &user_bin, &path_dirs);

    let homebrew_bin = PathBuf::from("/opt/homebrew/bin");
    push_unique_if_relevant(&mut dirs, &mut seen, &homebrew_bin, &path_dirs);

    let usr_local_bin = PathBuf::from("/usr/local/bin");
    push_unique_if_relevant(&mut dirs, &mut seen, &usr_local_bin, &path_dirs);

    for dir in path_dirs {
        push_unique(&mut dirs, &mut seen, dir);
    }

    dirs
}

fn push_unique_if_relevant(
    dirs: &mut Vec<PathBuf>,
    seen: &mut HashSet<PathBuf>,
    dir: &Path,
    path_dirs: &[PathBuf],
) {
    let command_path = dir.join(COMMAND_NAME);
    if path_dirs.iter().any(|candidate| candidate == dir) || dir.exists() || command_path.exists() {
        push_unique(dirs, seen, dir.to_path_buf());
    }
}

fn push_unique(dirs: &mut Vec<PathBuf>, seen: &mut HashSet<PathBuf>, dir: PathBuf) {
    if seen.insert(dir.clone()) {
        dirs.push(dir);
    }
}

fn shell_path_dirs() -> Vec<PathBuf> {
    std::env::var_os("PATH")
        .map(|paths| std::env::split_paths(&paths).collect())
        .unwrap_or_default()
}

fn current_binary_path() -> Result<PathBuf, EulerError> {
    std::env::current_exe().map_err(|error| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Could not determine binary path: {}", error),
        ))
    })
}

fn home_dir_path() -> Result<PathBuf, EulerError> {
    dirs::home_dir().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine home directory.",
        ))
    })
}

fn same_command(path: &Path, source_path: &Path) -> bool {
    match (std::fs::canonicalize(path), std::fs::canonicalize(source_path)) {
        (Ok(lhs), Ok(rhs)) => lhs == rhs,
        _ => false,
    }
}

#[cfg(unix)]
fn install_link_without_elevation(source_path: &Path, target_path: &Path) -> Result<(), EulerError> {
    use std::os::unix::fs::symlink;

    let parent = target_path.parent().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Could not determine install directory for {}", target_path.display()),
        ))
    })?;

    std::fs::create_dir_all(parent)?;

    if let Ok(metadata) = std::fs::symlink_metadata(target_path) {
        if metadata.file_type().is_dir() {
            return Err(EulerError::Io(std::io::Error::new(
                std::io::ErrorKind::AlreadyExists,
                format!(
                    "Cannot install '{}' because {} is a directory.",
                    COMMAND_NAME,
                    target_path.display()
                ),
            )));
        }
        std::fs::remove_file(target_path)?;
    }

    symlink(source_path, target_path)?;
    Ok(())
}

#[cfg(not(unix))]
fn install_link_without_elevation(_source_path: &Path, _target_path: &Path) -> Result<(), EulerError> {
    Err(EulerError::Io(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "CLI installation is currently only supported on Unix-like systems.",
    )))
}

#[cfg(target_os = "macos")]
fn install_link_with_elevation(source_path: &Path, target_path: &Path) -> Result<(), EulerError> {
    let parent = target_path.parent().ok_or_else(|| {
        EulerError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Could not determine install directory for {}", target_path.display()),
        ))
    })?;

    let script = format!(
        "do shell script \"mkdir -p \" & quoted form of \"{}\" & \" && ln -sf \" & quoted form of \"{}\" & \" \" & quoted form of \"{}\" with administrator privileges",
        applescript_string(&parent.to_string_lossy()),
        applescript_string(&source_path.to_string_lossy()),
        applescript_string(&target_path.to_string_lossy()),
    );

    let output = std::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|error| {
            EulerError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to run osascript: {}", error),
            ))
        })?;

    if output.status.success() {
        return Ok(());
    }

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

#[cfg(not(target_os = "macos"))]
fn install_link_with_elevation(_source_path: &Path, _target_path: &Path) -> Result<(), EulerError> {
    Err(EulerError::Io(std::io::Error::new(
        std::io::ErrorKind::PermissionDenied,
        "Euler needs a writable bin directory to install the CLI helper on this platform.",
    )))
}

#[cfg(target_os = "macos")]
fn applescript_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
