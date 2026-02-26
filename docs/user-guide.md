# User Guide

## Open or Create Documents

- Open an existing `.tex` file:
  - Welcome screen: **Open File**
  - Shortcut: `Cmd/Ctrl + O`
  - Command palette: `Open Document`
- Create a new document from the built-in template:
  - Welcome screen: **New Document**
  - Shortcut: `Cmd/Ctrl + N`
  - Command palette: `New Document`

## Save Behavior

- Manual save: `Cmd/Ctrl + S`
- Auto-save: when enabled, Euler saves the current file about 2 seconds after edits.
- Dirty indicator:
  - Header shows `*` next to filename when unsaved.
  - Window title includes `(unsaved)`.

## Command Palette

Open with `Cmd/Ctrl + K`.

Available actions include:

- Toggle auto-save
- Toggle Vim mode
- Toggle relative line numbers
- Toggle line numbers (show/hide)
- Switch compiler (`pdflatex`, `xelatex`, `lualatex`)
- Adjust compile debounce presets (200ms, 500ms, 800ms, 1500ms, 3000ms)
- Switch theme (6 built-in themes)
- Change UI font (from system-installed fonts)
- Change code font (from system-installed fonts)
- Create/open document

## Snippet Autocomplete

Type `\` in the editor to trigger snippet suggestions. Available snippets include:

- **Environments** (18): `begin`, `figure`, `table`, `itemize`, `enumerate`, `equation`, `align`, `tabular`, `tikzpicture`, `verbatim`, `minipage`, and more.
- **Commands** (27+): `frac`, `sqrt`, `href`, `includegraphics`, `newcommand`, `usepackage`, `documentclass`, `section`, `textbf`, `cite`, `ref`, `label`, `sum`, `int`, and more.
- **Document template**: Type `new` for a full document skeleton.

## PDF Preview

- Preview updates automatically after successful compile.
- Double-buffered rendering: new PDFs load in the background while the current one stays visible (no flicker).
- Multi-page navigation with floating prev/next controls (auto-hide after 2s of inactivity).
- Zoom in/out with `Cmd/Ctrl + Plus` / `Cmd/Ctrl + Minus` when hovering or focusing the preview pane.
- If compile fails, errors are shown in the preview panel.

## Editor Zoom

- Zoom in/out with `Cmd/Ctrl + Plus` / `Cmd/Ctrl + Minus` when the editor is focused.
- Zoom target is context-aware: hovering/focusing the editor zooms editor font size; hovering/focusing the PDF zooms the PDF scale.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + O` | Open file |
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + N` | New document |
| `Cmd/Ctrl + Plus` | Zoom in (context-aware) |
| `Cmd/Ctrl + Minus` | Zoom out (context-aware) |

## Open a File from CLI

Pass a positional file argument:

```bash
bun tauri dev -- /absolute/path/to/file.tex
```

## Fonts

Euler ships with Geist (UI) and Geist Mono (code editor) as default fonts. You can change both via the command palette to any font installed on your system, including built-in aliases like System Sans, Serif, SF Mono, and Courier New.

## Themes

Six themes are included out of the box:

- Vercel Dark (default)
- Vercel Light
- Catppuccin Latte
- Catppuccin Frappe
- Catppuccin Macchiato
- Catppuccin Mocha

Switch themes from the command palette. Custom themes can be added as JSON files in `~/.euler/themes/`.

## Notes

- Relative LaTeX asset paths (e.g. `\includegraphics`) resolve against the opened source file directory when compiling.
- Supported compiler names are restricted to `pdflatex`, `xelatex`, and `lualatex`.
