# Contributing

Thanks for helping improve ChatMusic. Keep changes small, focused, and easy to review.

## Development Workflow

1. Install dependencies with `npm install`.
2. Create a branch for one logical change.
3. Make the smallest code or documentation change that solves the problem.
4. Add or update tests when behavior changes.
5. Run `npm run check` before committing.
6. Commit with a clear conventional message.

## Commit Messages

Use short conventional prefixes:

- `feat:` for user-visible features.
- `fix:` for bug fixes.
- `test:` for test coverage changes.
- `docs:` for documentation-only changes.
- `chore:` for tooling, dependency, or maintenance changes.
- `ci:` for CI workflow changes.
- `refactor:` for behavior-preserving code changes.

Examples:

```text
feat: add soundfont source selector
fix: avoid duplicate renders during streaming updates
test: cover abc detector edge cases
```

## Required Checks

Run the full check before opening a pull request:

```sh
npm run check
```

This runs dependency audit, version consistency checks, ESLint, TypeScript, unit tests, and production build.
The production build step covers both the Chrome extension and standalone Studio web targets.

## Versioning and Changelog

- Keep `version` in [package.json](package.json) and [manifest.json](manifest.json) synchronized.
- Use numeric `X.Y.Z` versions for Chrome extension releases. Chrome does not accept npm prerelease strings in `manifest.json`; use release notes or store metadata for prerelease context instead.
- Update [CHANGELOG.md](CHANGELOG.md) for user-visible changes, release process changes, permission changes, and compatibility notes.
- Keep unreleased work under the `Unreleased` heading until preparing a Chrome Web Store release.
- Run `npm run version:check` after changing either version file.

## Code Style

- Use TypeScript in strict mode.
- Use ESLint only. Do not add Prettier unless the project explicitly decides to adopt it later.
- Prefer small functions around the existing `detector`, `renderer`, content script, popup, and service worker boundaries.
- Keep extension/web cross-target code behind the adapters documented in [docs/dual-build.md](docs/dual-build.md).
- Do not commit `dist/`, `dist-web/`, `node_modules`, Chrome signing keys, or packaged extension archives.

## Tests

- Unit tests use Vitest.
- DOM-dependent tests use jsdom.
- Put narrow tests next to the code they cover, using `*.test.ts`.
- Start with detector and state-transition tests before adding browser-level end-to-end tests.

## Extension Permissions

Keep extension permissions minimal. Any change to `manifest.json` permissions or host permissions should explain why the extension needs that access.

## Pull Requests

Before requesting review, include:

- What changed.
- How it was tested.
- Any permission, privacy, or release impact.