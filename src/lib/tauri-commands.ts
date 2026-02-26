import { invoke } from "@tauri-apps/api/core";
import type { CompileResult, EulerConfig } from "../types";

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

export async function installCli(): Promise<string> {
  return invoke<string>("install_cli");
}
