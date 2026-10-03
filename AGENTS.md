# Repository Guidelines

## Project Structure & Module Organization

- Next.js/TypeScript app; routes/API in `pages/`, shared UI in `components/`; state/utilities in `contexts/`, `hooks/`, and `utils/`.
- Global styles and assets in `styles/` and `public/` (generated FS indexes in `public/.index/`); build helpers in `scripts/`.
- Tests: Jest specs in `__tests__/`; Playwright flows in `e2e/`; static export in `out/`.

## Build, Test, and Development Commands

- `yarn install` to set up.
- `yarn dev` or `yarn dev:ssl` to run locally.
- `yarn build:prebuild` generates RSS, search index, cached shortcuts, and FS JSON.
- `yarn build` runs prebuild + `next build`; `yarn serve` hosts `out/`.
- Quality: `yarn test`, `yarn e2e`, `yarn eslint`, `yarn stylelint`, `yarn prettier`.
- Docker: `yarn build` then `yarn docker:build` / `yarn docker:run`.

## Coding Style & Naming Conventions

- `.editorconfig`: UTF-8, CRLF, 2-space indent, trim trailing whitespace, final newline.
- Prettier uses ES5 trailing commas; ESLint + Stylelint lint TS/TSX/styled content�auto-fix before commit.
- Prefer functional components and named exports. Components/files use `PascalCase`; hooks start with `use`; helpers `camelCase`; constants `SCREAMING_SNAKE_CASE`.

## Testing Guidelines

- Unit/UI tests live beside `__tests__/` using Jest (`*.test.ts[x]`). Mock browser APIs sparingly; keep tests deterministic.
- Playwright specs in `e2e/` cover core flows (boot, desktop, file ops); run `yarn e2e` for UI changes.
- Cover new logic and edge cases (FS operations, window management, async dialogs) before merging.

## Commit & Pull Request Guidelines

- Commits use short, imperative subjects (e.g., `Fix window focus`, `Update search index`).
- PRs: describe changes, risks, and commands run; link issues; add screenshots/clips for UI shifts; keep generated artifacts out unless required.

## Security & Configuration Tips

- Keep secrets in untracked `.env`; mirror CI/Docker `NODE_OPTIONS=--openssl-legacy-provider` when needed.
- Store large media in `public/` or external storage to avoid repo bloat.
