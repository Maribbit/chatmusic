# Project Guidelines

## Code Style

- Use TypeScript with the existing strict compiler settings.
- Use ESLint only for quality and lightweight style checks. Do not add Prettier unless the project explicitly decides to adopt it.
- Keep changes scoped to the relevant boundary: detector, renderer, content entry, popup, background worker, tooling, or docs.

## Architecture

- `src/content/detector.ts` owns ABC detection and should stay testable without browser extension APIs.
- `src/content/renderer.ts` owns abcjs rendering and playback setup.
- `src/content/index.ts` owns DOM scanning, mutation observation, and content-script state.
- `src/popup/` owns user-facing extension settings.
- `src/background/` owns extension-wide service worker behavior.

## Build and Test

- Run `npm run check` before committing or reporting completion for code changes.
- For narrower feedback, use `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Add or update Vitest unit tests for detector logic and state transitions when behavior changes.

## Repository Conventions

- Do not commit `dist/`, `node_modules/`, `*.crx`, `*.pem`, or packaged zip files.
- Keep `package-lock.json` committed.
- Use conventional commit prefixes such as `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`, and `refactor:`.
- Explain any `manifest.json` permission or host permission changes.
- Do not tag releases, create Chrome Web Store packages, or publish without an explicit user request.

See [../CONTRIBUTING.md](../CONTRIBUTING.md), [../docs/ai-assisted-development.md](../docs/ai-assisted-development.md), and [../docs/release.md](../docs/release.md) for full process details.