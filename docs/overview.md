# Overview

Euler is a minimal desktop LaTeX editor focused on fast editing and immediate PDF feedback.

## Core Features

- Live LaTeX compilation with configurable debounce.
- Monaco-based LaTeX editor with optional Vim mode, relative line numbers, and toggleable line numbers.
- LaTeX snippet autocomplete (45+ snippets for environments and commands), triggered with `\`.
- Side-by-side PDF preview with multi-page navigation and zoom.
- Command palette (`Cmd/Ctrl + K`) for actions and settings.
- Open/save `.tex` files with unsaved change tracking.
- Optional auto-save.
- Compiler switching: `pdflatex`, `xelatex`, `lualatex`.
- Customizable UI and code fonts with system font picker.
- 6 built-in themes: Vercel Dark, Vercel Light, Catppuccin Latte, Catppuccin Frappe, Catppuccin Macchiato, Catppuccin Mocha.
- CLI file argument support (open a file on launch).
- Cross-platform release builds (macOS, Linux, Windows).

## Runtime Data

Euler stores user/runtime data in:

```text
~/.euler/
  config.json
  themes/
  tmp/
```

- `config.json`: persisted app settings.
- `themes/`: theme JSON files (6 built-in themes).
- `tmp/`: generated `.tex` and `.pdf` artifacts from compilations.

## Default Settings

Persisted backend defaults (`src-tauri/src/config.rs`):

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

## Compile Flow

1. Editor content changes.
2. Frontend hook `useCompiler` debounces compile calls.
3. Frontend invokes Tauri command `compile_latex`.
4. Rust writes a temporary `.tex` file under `~/.euler/tmp`.
5. Chosen LaTeX compiler runs with the source file's parent directory as working directory (for relative path resolution of `\input`, `\includegraphics`, etc.).
6. Generated PDF is returned to frontend as base64 and rendered in the preview pane with double-buffered loading (no flicker).
7. LaTeX errors are parsed from log lines starting with `!` and displayed in the UI.
