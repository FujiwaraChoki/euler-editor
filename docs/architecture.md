# Architecture

## Stack

- Frontend: React 19 + TypeScript + Vite
- Desktop shell: Tauri v2
- Backend: Rust + Tokio
- Editor: Monaco (`@monaco-editor/react`)
- PDF renderer: `react-pdf` / PDF.js
- Font enumeration: `font-kit` (Rust)

## High-Level Structure

```text
src/
  App.tsx                  # Main app composition
  components/              # Editor, preview, palette, status UI
  hooks/                   # Settings, compile, file ops, CLI args, shortcuts, theme
  lib/                     # Tauri command wrappers, LaTeX language config, snippets
  styles/                  # CSS vars, Monaco theme mapping, font handling
  types/                   # Shared TS interfaces

src-tauri/src/
  lib.rs                   # Tauri setup + command registration
  commands/                # compile, file ops, settings, themes, fonts
  compiler.rs              # LaTeX process orchestration and error parsing
  config.rs                # Settings schema + defaults
  error.rs                 # Error types mapped to Tauri responses
```

## Frontend Responsibilities

- Manage editor content and file state (`useFileOperations`).
- Trigger debounced compilation and track latest compile status (`useCompiler`).
- Load/update persisted settings (`useSettings`).
- Load/apply theme data to CSS variables and Monaco (`useTheme`).
- Parse positional CLI file argument (`useCliArgs`).
- Register global keyboard shortcuts (`useKeyboardShortcuts`).
- Register LaTeX snippet autocomplete provider (`latex-snippets.ts`).
- Build font option lists and generate font CSS (`fonts.ts`).

## Backend Responsibilities

Exposed Tauri commands (invoked from `src/lib/tauri-commands.ts`):

- `compile_latex(content, file_stem, compiler, file_path?)` — compile LaTeX source to PDF.
- `read_file(path)` — read file contents.
- `write_file(path, content)` — write to existing file.
- `create_file(path, content)` — create new file.
- `file_exists(path)` — check file existence.
- `get_settings()` — read `~/.euler/config.json`.
- `save_settings(config)` — write `~/.euler/config.json`.
- `get_themes()` — list all theme names.
- `get_theme(name)` — read a theme JSON.
- `save_theme(name, theme)` — write a theme JSON.
- `get_system_fonts()` — enumerate installed system fonts via font-kit.

## Compile Pipeline Details

- `compile_latex` ensures `~/.euler/tmp` exists.
- `compiler.rs::compile_tex` validates compiler name.
- Source is written to `tmp/<file_stem>.tex`.
- Compiler is executed with `-interaction=nonstopmode -halt-on-error` and `-output-directory=<tmp>`.
- Working directory uses the opened file's parent path when available (for relative `\input`, `\includegraphics`, etc.).
- Generated PDF is base64 encoded and returned.
- LaTeX log lines starting with `!` are grouped into surfaced error messages.

## PDF Rendering

- Double-buffered: new PDF loads in background while current one stays visible.
- Multi-page support with IntersectionObserver-based page tracking.
- Independent zoom control (separate from editor zoom).
- Floating navigation controls with auto-hide behavior.

## App Startup

On startup (`src-tauri/src/lib.rs`), Euler:

1. Creates `~/.euler`, `~/.euler/themes`, and `~/.euler/tmp` if missing.
2. Writes default `config.json` if absent.
3. Writes 6 built-in theme JSON files if absent (Vercel Dark/Light, Catppuccin Latte/Frappe/Macchiato/Mocha).
4. Migrates legacy `default-dark.json` to `vercel-dark.json` if needed.
