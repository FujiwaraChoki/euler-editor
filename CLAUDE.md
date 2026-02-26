# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Euler?

Euler is a live LaTeX editor built as a Tauri v2 desktop app. It features a split-pane UI with a Monaco-based LaTeX editor on the left and a real-time PDF preview on the right. LaTeX compilation happens in the Rust backend via system-installed compilers (pdflatex, xelatex, lualatex), with the compiled PDF sent to the frontend as base64.

## Commands

```bash
# Development (starts both Vite dev server and Tauri window)
bun tauri dev

# Build for production
bun tauri build

# Frontend-only dev server (no Tauri backend — Tauri commands will fail)
bun run dev

# Type check
tsc --noEmit

# Rust backend checks (from src-tauri/)
cd src-tauri && cargo check
cd src-tauri && cargo clippy
```

Package manager is **bun** (lockfile: `bun.lock`).

## Architecture

### Two-process model

- **Frontend** (`src/`): React 19 + TypeScript + Vite. Renders in Tauri's webview.
- **Backend** (`src-tauri/`): Rust. Handles file I/O, settings persistence, theme management, and LaTeX compilation.

Communication between frontend and backend uses Tauri's `invoke` IPC. All invoke wrappers live in `src/lib/tauri-commands.ts`, which maps 1:1 to the `#[tauri::command]` functions registered in `src-tauri/src/lib.rs`.

### Frontend structure

- `src/App.tsx` — Root component. Orchestrates the split-pane layout (editor + PDF preview), header bar, command palette, and wires together all hooks.
- `src/components/` — `Editor` (Monaco), `PdfPreview` (react-pdf), `CompileIndicator`, `CommandPalette`.
- `src/hooks/` — State management via custom hooks:
  - `useCompiler` — Debounced auto-compilation. Sends content to backend, discards stale results.
  - `useFileOperations` — File open/save/create state, dirty tracking.
  - `useSettings` — Loads/saves `EulerConfig` from backend.
  - `useTheme` — Theme loading, CSS variable application, Monaco theme registration.
  - `useCliArgs` — Reads CLI file argument on startup.
  - `useKeyboardShortcuts` — Global keyboard shortcut registration.
- `src/lib/tauri-commands.ts` — Typed wrappers around `invoke()` for all Tauri commands.
- `src/types/index.ts` — Shared TypeScript interfaces (`CompileResult`, `EulerConfig`, `Theme`, `ThemeColors`).
- `src/styles/` — CSS variables, theme application (`themes.ts`), Monaco theme generation (`monaco-theme.ts`).

Styling uses inline `React.CSSProperties` objects and CSS custom properties (no CSS framework).

### Backend structure (src-tauri/src/)

- `lib.rs` — App setup: registers Tauri plugins (opener, cli, fs), registers all commands, creates `~/.euler/` directories and default config/theme on first run.
- `commands/` — Tauri command handlers:
  - `compile.rs` — `compile_latex`: invokes the compiler via `compiler.rs`.
  - `file_ops.rs` — `read_file`, `write_file`, `file_exists`, `create_file`.
  - `settings.rs` — `get_settings`, `save_settings` (reads/writes `~/.euler/config.json`).
  - `theme.rs` — `get_themes`, `get_theme`, `save_theme` (reads/writes `~/.euler/themes/*.json`).
- `compiler.rs` — Spawns the LaTeX compiler process, reads the resulting PDF, returns base64-encoded output.
- `config.rs` — `EulerConfig` struct with defaults (pdflatex, auto_save on, 800ms debounce).
- `error.rs` — `EulerError` enum with Serialize impl for IPC.

### User data directory

All persistent data lives in `~/.euler/`:
- `config.json` — User settings.
- `themes/` — Theme JSON files.
- `tmp/` — Temporary .tex and .pdf files during compilation.

### Key conventions

- When adding a new Tauri command: define in `src-tauri/src/commands/`, register in `lib.rs` `invoke_handler`, add a typed wrapper in `src/lib/tauri-commands.ts`.
- Types mirrored between Rust (`config.rs`, `compiler.rs`) and TypeScript (`src/types/index.ts`) must stay in sync manually.
- Supported LaTeX compilers: `pdflatex`, `xelatex`, `lualatex` (validated in `compiler.rs`).
