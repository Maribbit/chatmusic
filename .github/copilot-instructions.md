# Project Guidelines

## Code Style

- Use TypeScript with the existing strict compiler settings.
- Use ESLint only for quality and lightweight style checks. Do not add Prettier unless the project explicitly decides to adopt it.
- Keep changes scoped to the relevant boundary: detector, player, content entry, popup, background worker, tooling, or docs.

## AI Context Workflow

- Treat `docs/specs/README.md` as the first routing table for code changes. Pick the relevant spec before reading implementation files.
- Use the selected spec's `Code & Verification Map` to jump directly to the smallest source and test anchors. Avoid broad repository searches unless the spec map is missing or contradicted by the current tree.
- If a change moves code, adds tests, removes tests, or changes a domain boundary, update the relevant `docs/specs/*.md` mapping in the same change.
- If no existing spec fits a code change, update `docs/specs/README.md` or the nearest spec before expanding the architecture.

## Architecture

- `src/content/detectors/` owns ABC detection and should stay testable without browser extension APIs.
- `src/player/` owns reusable score rendering, playback setup, player controls, and Shadow DOM view code.
- `src/content/index.ts` owns DOM scanning, mutation observation, and content-script state.
- `src/popup/` owns user-facing extension settings.
- `src/background/` owns extension-wide service worker behavior.

## Build and Test

- Run `npm run check` before committing or reporting completion for code changes.
- For narrower feedback, use `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Use `npm run version:check` after changing `package.json` or `manifest.json` versions.
- Add or update Vitest unit tests for detector logic and state transitions when behavior changes.

## Repository Conventions

- Do not commit `dist/`, `dist-web/`, `node_modules/`, `*.crx`, `*.pem`, or packaged zip files.
- Keep `package-lock.json` committed.
- Use conventional commit prefixes such as `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`, and `refactor:`.
- Keep `package.json` and `manifest.json` versions synchronized with numeric `X.Y.Z` values.
- Update `CHANGELOG.md` for user-visible changes, release process changes, permission changes, and compatibility notes.
- Explain any `manifest.json` permission or host permission changes.
- Do not tag releases, create Chrome Web Store packages, or publish without an explicit user request.

See [../docs/specs/README.md](../docs/specs/README.md), [../CONTRIBUTING.md](../CONTRIBUTING.md), [../docs/ai-assisted-development.md](../docs/ai-assisted-development.md), and [../docs/release.md](../docs/release.md) for full process details.