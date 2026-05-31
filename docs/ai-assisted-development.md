# AI-Assisted Development Guide

This project is friendly to AI-assisted development, but generated changes should be treated like normal code contributions: small, reviewed, tested, and documented.

## Agent Checklist

Before editing:

1. Read [README.md](../README.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and [.github/copilot-instructions.md](../.github/copilot-instructions.md).
2. Check `git status --short` and preserve user changes.
3. Read [docs/specs/README.md](specs/README.md) and choose the one relevant domain spec.
4. Use that spec's `Code & Verification Map` to open the smallest source and test anchors.
5. Identify the smallest project boundary involved: detector, player, content entry, popup, background worker, Studio, shared adapter, tooling, or docs.

Before committing:

1. Run `npm run check`.
2. Confirm `dist/`, `node_modules/`, package archives, and signing keys are not staged.
3. Update the relevant `docs/specs/*.md` map when source/test paths or domain boundaries changed.
4. Update [CHANGELOG.md](../CHANGELOG.md) for user-visible behavior or release process changes.
5. Summarize behavior changes and test coverage in the final response or pull request.

## Specs-First Context Economy

The specs directory is the AI context entry point, not an after-the-fact documentation folder.

- Start with the smallest relevant spec, then follow its source and test anchors.
- Prefer one local read around the owning implementation over scanning unrelated directories.
- Do not load all of `src/` to understand a task when a spec map already points to the domain.
- If the spec map is stale, correct it instead of working around it silently.
- Keep code, tests, and specs synchronized in the same change whenever behavior or ownership changes.

## Preferred Agent Behavior

- Follow existing TypeScript and DOM patterns before adding abstractions.
- Use ESLint only for code style and quality checks.
- Do not introduce Prettier, a new formatter, or a larger framework without an explicit project decision.
- Add unit tests for detector logic and state transitions when behavior changes.
- For extension/web dual-build changes, use the adapters in [dual-build.md](dual-build.md) and add regression tests for the adapter behavior.
- Keep manifest permissions narrow and explain any permission change.
- Do not commit generated extension builds.

## Commit Flow

Use one logical commit per task when possible.

Recommended prefixes:

```text
feat: user-facing feature
fix: bug fix
test: tests only or test infrastructure
docs: documentation only
chore: tooling or maintenance
ci: CI workflow changes
refactor: behavior-preserving code changes
```

## Release Awareness

Agents should not publish the extension, create Chrome Web Store packages, or tag releases unless the user explicitly asks. Release preparation should follow [docs/release.md](release.md).

When changing versions, keep `package.json` and `manifest.json` synchronized, use numeric `X.Y.Z` versions, update [CHANGELOG.md](../CHANGELOG.md), and run `npm run version:check` or `npm run check`.