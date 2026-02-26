# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + TypeScript frontend.
- `src/components/` holds UI components (e.g., `Editor.tsx`, `PdfPreview.tsx`).
- `src/hooks/` stores reusable stateful logic (`useCompiler.ts`, `useSettings.ts`).
- `src/lib/` includes frontend integration helpers (Tauri command wrappers, language config).
- `src/styles/` and `src/types/` contain theme/style definitions and shared types.
- `src-tauri/` is the Rust backend for the desktop app; command handlers live in `src-tauri/src/commands/`.
- `public/` has static assets; `dist/` and `src-tauri/target/` are generated outputs and should not be edited directly.

## Build, Test, and Development Commands
- `bun install`: install JavaScript dependencies (preferred package manager; lockfile is `bun.lock`).
- `bun run dev`: start the Vite dev server (configured for port `1420`).
- `bun run build`: run TypeScript checks (`tsc`) and produce a frontend build in `dist/`.
- `bun run preview`: preview the production frontend bundle locally.
- `bun run tauri dev`: run the desktop app in development mode.
- `bun run tauri build`: build distributable native app bundles.
- `cd src-tauri && cargo check`: fast Rust compile validation.

## Coding Style & Naming Conventions
- TypeScript/React: 2-space indentation, double quotes, semicolons, and clear typed interfaces.
- Component files use PascalCase (`CommandPalette.tsx`); hooks use `useX` camelCase (`useFileOperations.ts`).
- Rust follows standard style: snake_case for functions/modules, PascalCase for types.
- Keep frontend-to-backend API calls centralized in `src/lib/tauri-commands.ts`.

## Testing Guidelines
- No automated test framework is currently configured in this repository.
- Before opening a PR, run:
  - `bun run build`
  - `cd src-tauri && cargo check`
  - `bun run tauri dev` and smoke-test open/save/compile flows.
- If adding tests, use `*.test.ts` / `*.test.tsx` naming and colocate with source or under `src/__tests__/`.

## Commit & Pull Request Guidelines
- Local snapshot does not include `.git` history; use Conventional Commit style (`feat:`, `fix:`, `chore:`, `refactor:`) for consistency.
- Keep each commit scoped to one logical change.
- PRs should include: a short summary, linked issue/ticket, commands run for verification, and screenshots for UI changes.
