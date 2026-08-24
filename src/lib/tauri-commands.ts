import { invoke } from "@tauri-apps/api/core";
import type { CliIntegrationStatus, CodexEditResult, CodexStatus, CompileResult, EulerConfig } from "../types";

export async function compileLatex(
  content: string,
  fileStem: string,
  compiler: string,
  filePath?: string | null
): Promise<CompileResult> {
  return invoke<CompileResult>("compile_latex", {
    content,
    fileStem,
    compiler,
    filePath: filePath ?? null,
  });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_file", { path, content });
}

export async function createFile(path: string, content: string): Promise<void> {
  return invoke<void>("create_file", { path, content });
}

export async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>("file_exists", { path });
}

export async function getSettings(): Promise<EulerConfig> {
  return invoke<EulerConfig>("get_settings");
}

export async function saveSettings(config: EulerConfig): Promise<void> {
  return invoke<void>("save_settings", { config });
}

export async function getThemes(): Promise<any[]> {
  return invoke<any[]>("get_themes");
}

export async function getTheme(name: string): Promise<any> {
  return invoke<any>("get_theme", { name });
}

export async function saveTheme(name: string, theme: any): Promise<void> {
  return invoke<void>("save_theme", { name, theme });
}

export async function getSystemFonts(): Promise<string[]> {
  return invoke<string[]>("get_system_fonts");
}

export async function getCliStatus(): Promise<CliIntegrationStatus> {
  return invoke<CliIntegrationStatus>("get_cli_status");
}

export async function installCli(): Promise<CliIntegrationStatus> {
  return invoke<CliIntegrationStatus>("install_cli");
}

export async function getCodexStatus(): Promise<CodexStatus> {
  return invoke<CodexStatus>("get_codex_status");
}

export async function applyCodexEdit(prompt: string, filePath: string): Promise<CodexEditResult> {
  return invoke<CodexEditResult>("apply_codex_edit", {
    prompt,
    filePath,
  });
}
