use serde::Serialize;
use std::path::Path;
use std::process::Stdio;
use std::sync::Mutex;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::process::{Child, Command};
use tokio::time::sleep;

#[derive(Debug)]
struct CodexServerProcess {
    child: Child,
    directory: String,
    listen_url: String,
}

#[derive(Default)]
pub struct CodexServerState {
    process: Mutex<Option<CodexServerProcess>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CodexServerStatus {
    pub running: bool,
    pub directory: Option<String>,
    pub listen_url: Option<String>,
}

impl CodexServerState {
    fn status_locked(process: &mut Option<CodexServerProcess>) -> CodexServerStatus {
        if let Some(active) = process.as_mut() {
            if let Ok(Some(_)) = active.child.try_wait() {
                *process = None;
            }
        }

        if let Some(active) = process.as_ref() {
            return CodexServerStatus {
                running: true,
                directory: Some(active.directory.clone()),
                listen_url: Some(active.listen_url.clone()),
            };
        }

        CodexServerStatus {
            running: false,
            directory: None,
            listen_url: None,
        }
    }
}

#[tauri::command]
pub async fn get_codex_server_status(
    state: tauri::State<'_, CodexServerState>,
) -> Result<CodexServerStatus, String> {
    let mut guard = state
        .process
        .lock()
        .map_err(|_| "Codex app-server lock poisoned".to_string())?;

    Ok(CodexServerState::status_locked(&mut guard))
}

#[tauri::command]
pub async fn start_codex_server(
    state: tauri::State<'_, CodexServerState>,
    directory: String,
    port: u16,
) -> Result<CodexServerStatus, String> {
    if port == 0 {
        return Err("Port must be greater than 0".to_string());
    }

    let directory_path = Path::new(&directory);
    if !directory_path.exists() {
        return Err("Directory does not exist".to_string());
    }
    if !directory_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    {
        let mut guard = state
            .process
            .lock()
            .map_err(|_| "Codex app-server lock poisoned".to_string())?;

        let status = CodexServerState::status_locked(&mut guard);
        if status.running {
            return Err("Codex app-server is already running".to_string());
        }
    }

    let listen_url = format!("ws://127.0.0.1:{}", port);

    let mut child = Command::new("codex")
        .args(["app-server", "--listen", &listen_url])
        .current_dir(&directory)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Failed to start Codex app-server: {}", error))?;

    let endpoint = format!("127.0.0.1:{}", port);
    let mut ready = false;

    for _ in 0..50 {
        match TcpStream::connect(&endpoint).await {
            Ok(_) => {
                ready = true;
                break;
            }
            Err(_) => {
                if let Ok(Some(status)) = child.try_wait() {
                    return Err(format!(
                        "Codex app-server exited early with status {}",
                        status
                    ));
                }
                sleep(Duration::from_millis(100)).await;
            }
        }
    }

    if !ready {
        let _ = child.kill().await;
        let _ = child.wait().await;
        return Err("Codex app-server did not become ready on the selected port".to_string());
    }

    let mut guard = state
        .process
        .lock()
        .map_err(|_| "Codex app-server lock poisoned".to_string())?;

    let status = CodexServerState::status_locked(&mut guard);
    if status.running {
        let _ = child.start_kill();
        return Err("Codex app-server is already running".to_string());
    }

    *guard = Some(CodexServerProcess {
        child,
        directory,
        listen_url,
    });

    Ok(CodexServerState::status_locked(&mut guard))
}

#[tauri::command]
pub async fn stop_codex_server(
    state: tauri::State<'_, CodexServerState>,
) -> Result<CodexServerStatus, String> {
    let process = {
        let mut guard = state
            .process
            .lock()
            .map_err(|_| "Codex app-server lock poisoned".to_string())?;
        guard.take()
    };

    if let Some(mut active) = process {
        match active.child.try_wait() {
            Ok(Some(_)) => {}
            Ok(None) => {
                active
                    .child
                    .kill()
                    .await
                    .map_err(|error| format!("Failed to stop Codex app-server: {}", error))?;
            }
            Err(error) => {
                return Err(format!(
                    "Failed to query Codex app-server status: {}",
                    error
                ));
            }
        }

        let _ = active.child.wait().await;
    }

    Ok(CodexServerStatus {
        running: false,
        directory: None,
        listen_url: None,
    })
}
