<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="Euler Logo" width="110" />
</p>

<h1 align="center">Euler</h1>

<p align="center">
  A minimal live LaTeX editor built with Tauri, React, and Rust.
</p>

<p align="center">
  <a href="https://github.com/FujiwaraChoki/euler-editor">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/FujiwaraChoki/euler-editor?style=for-the-badge&logo=github" />
  </a>
  <a href="https://github.com/FujiwaraChoki/euler-editor/commits/main">
    <img alt="Last commit" src="https://img.shields.io/github/last-commit/FujiwaraChoki/euler-editor?style=for-the-badge&logo=github" />
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
bun run tauri dev
```

Optional frontend-only dev server:

```bash
bun run dev
```

## Build

```bash
bun run build
cd src-tauri && cargo check
bun run tauri build
```

## Usage

Open a `.tex` file from CLI (positional argument):

```bash
bun run tauri dev -- /absolute/path/to/file.tex
```

Keyboard shortcuts:

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + O` | Open document |
| `Cmd/Ctrl + S` | Save document |
| `Cmd/Ctrl + N` | New document |

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
  "theme": "default-dark",
  "debounce_ms": 800,
  "vim_mode": false
}
```

## Project Structure

- `src/`: React + TypeScript frontend.
- `src/components/`: UI components (editor, preview, command palette).
- `src/hooks/`: stateful frontend logic.
- `src/lib/`: frontend Tauri command wrappers and language config.
- `src-tauri/`: Rust backend and Tauri app configuration.

## Development Commands

- `bun run dev`: Start Vite dev server.
- `bun run build`: Type-check and build frontend.
- `bun run preview`: Preview the frontend build.
- `bun run tauri dev`: Run full desktop app in dev mode.
- `bun run tauri build`: Build native desktop bundles.
- `cd src-tauri && cargo check`: Fast Rust compile validation.
