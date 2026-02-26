# Development

## Prerequisites

- [Bun](https://bun.sh/)
- Rust toolchain
- Tauri system prerequisites: https://v2.tauri.app/start/prerequisites/
- LaTeX distribution with at least one compiler:
  - `pdflatex`
  - `xelatex`
  - `lualatex`

## Install

```bash
bun install
```

## Run

- Frontend only (Vite):

```bash
bun run dev
```

- Full desktop app (recommended):

```bash
bun tauri dev
```

## Build

```bash
bun run build
cd src-tauri && cargo check
bun tauri build
```

## Type Check

```bash
tsc --noEmit
```

## Lint (Rust)

```bash
cd src-tauri && cargo clippy
```

## Recommended Validation Before PR

1. `tsc --noEmit`
2. `bun run build`
3. `cd src-tauri && cargo check`
4. `cd src-tauri && cargo clippy`
5. `bun tauri dev`
6. Smoke test:
   - Open `.tex` file
   - Edit content and verify live compile
   - Check PDF preview refreshes (no flicker)
   - Test multi-page navigation and zoom
   - Verify save and auto-save behavior
   - Switch compilers and confirm errors/success states
   - Test snippet autocomplete (type `\`)
   - Switch themes and fonts via command palette
   - Toggle line numbers, Vim mode, relative line numbers

## Releasing

Releases are automated via GitHub Actions. To create a release:

```bash
git tag v<version>
git push origin v<version>
```

The workflow builds for macOS (ARM64 + Intel), Linux (deb, AppImage), and Windows (msi, nsis), then publishes a GitHub release with all artifacts.

Manual releases can also be triggered from the Actions tab with a tag input.

## Useful Paths

- Frontend entry: `src/App.tsx`
- Tauri command wiring: `src-tauri/src/lib.rs`
- Compile implementation: `src-tauri/src/compiler.rs`
- Command implementations: `src-tauri/src/commands/`
- Font enumeration: `src-tauri/src/commands/fonts.rs`
- Snippet definitions: `src/lib/latex-snippets.ts`
- Font handling: `src/styles/fonts.ts`
- App config: `src-tauri/tauri.conf.json`
- Settings schema: `src-tauri/src/config.rs`
- Release workflow: `.github/workflows/release.yml`
