<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="Euler Logo" width="110" />
</p>

<h1 align="center">Euler</h1>

<p align="center">
  A minimal live LaTeX editor built with Tauri, React, and Rust.
</p>

<p align="center">
  <a href="https://github.com/FujiwaraChoki/euler-editor/releases/latest">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/FujiwaraChoki/euler-editor?style=for-the-badge&logo=github" />
  </a>
  <a href="https://github.com/FujiwaraChoki/euler-editor">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/FujiwaraChoki/euler-editor?style=for-the-badge&logo=github" />
  </a>
  <img alt="Tauri v2" src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-Backend-000000?style=for-the-badge&logo=rust&logoColor=white" />
</p>

## Features

- Live LaTeX compilation with debounced updates.
- Side-by-side Monaco editor and PDF preview.
- Compiler selection: `pdflatex`, `xelatex`, `lualatex`.
- Command palette (`Cmd/Ctrl + K`) for quick actions and settings.
- Open, edit, and save `.tex` files with dirty-state tracking.
- Persisted settings and themes in `~/.euler`.
- Positional CLI file argument support (open a file on launch).
- LaTeX snippet autocomplete triggered with `\` (45+ snippets for environments and commands).
- Customizable UI and code fonts with system font picker.
- 6 built-in themes (Vercel Dark/Light, Catppuccin Latte/Frappe/Macchiato/Mocha).
- Multi-page PDF navigation with zoom controls.
- Optional Vim mode and relative/toggleable line numbers.

## Download

Pre-built binaries for macOS (Apple Silicon & Intel), Linux, and Windows are available on the [Releases](https://github.com/FujiwaraChoki/euler-editor/releases/latest) page.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Monaco Editor, React PDF.
- Desktop shell: Tauri v2.
- Backend: Rust + Tokio.

## Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- Tauri system prerequisites: https://v2.tauri.app/start/prerequisites/
- A LaTeX distribution with at least one of:
  - `pdflatex`
  - `xelatex`
  - `lualatex`

## Quick Start

```bash
bun install
```

Run the desktop app in development mode:

```bash
bun tauri dev
```

Optional frontend-only dev server:

```bash
bun run dev
```

## Build

```bash
bun run build
cd src-tauri && cargo check
bun tauri build
```

## Usage

Open a `.tex` file from CLI (positional argument):

```bash
bun tauri dev -- /absolute/path/to/file.tex
```

Keyboard shortcuts:

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + O` | Open document |
| `Cmd/Ctrl + S` | Save document |
| `Cmd/Ctrl + N` | New document |
| `Cmd/Ctrl + Plus` | Zoom in (editor or PDF, context-aware) |
| `Cmd/Ctrl + Minus` | Zoom out (editor or PDF, context-aware) |

## Configuration

Euler stores runtime files in:

```text
~/.euler/
  config.json
  themes/
  tmp/
```

Default config:

```json
{
  "compiler": "pdflatex",
  "auto_save": true,
  "theme": "vercel-dark",
  "ui_font": "Geist",
  "code_font": "Geist Mono",
  "debounce_ms": 800,
  "vim_mode": false,
  "relative_line_numbers": false,
  "show_line_numbers": true
}
```

## Project Structure

- `src/`: React + TypeScript frontend.
- `src/components/`: UI components (editor, preview, command palette).
- `src/hooks/`: Stateful frontend logic.
- `src/lib/`: Tauri command wrappers, LaTeX language config, and snippet definitions.
- `src/styles/`: CSS variables, theme application, font handling.
- `src-tauri/`: Rust backend and Tauri app configuration.

## Development Commands

- `bun run dev`: Start Vite dev server.
- `bun run build`: Type-check and build frontend.
- `bun run preview`: Preview the frontend build.
- `bun tauri dev`: Run full desktop app in dev mode.
- `bun tauri build`: Build native desktop bundles.
- `cd src-tauri && cargo check`: Fast Rust compile validation.
- `cd src-tauri && cargo clippy`: Rust linter.
