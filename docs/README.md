# Euler Editor Documentation

This folder contains project documentation for the Euler desktop LaTeX editor.

## Contents

- [`overview.md`](./overview.md): Product overview, core features, and runtime behavior.
- [`user-guide.md`](./user-guide.md): How to use Euler day-to-day.
- [`architecture.md`](./architecture.md): Frontend/backend architecture and app flow.
- [`development.md`](./development.md): Local development workflows and validation checklist.

## At a Glance

Euler is a Tauri v2 desktop app with:

- React 19 + TypeScript frontend (`src/`)
- Rust command backend (`src-tauri/src/`)
- Live LaTeX compile + PDF preview
- 45+ LaTeX snippets with autocomplete
- 6 built-in themes (Vercel, Catppuccin)
- System font picker for UI and editor fonts
- Multi-page PDF navigation and zoom
- Persistent user settings/themes in `~/.euler`
- Cross-platform release builds via GitHub Actions
