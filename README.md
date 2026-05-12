# ChatMusic

ChatMusic is a Chrome extension that detects ABC notation in web page code blocks, renders the matching score below the block, and provides piano-style playback through abcjs.

The project is currently an MVP moving toward an open-source, Chrome Web Store ready extension.

## Features

- Detects ABC notation in `<pre>` and `<code>` blocks.
- Supports language-tag detection such as `language-abc` and `data-language="abc"`.
- Falls back to content detection using required ABC headers.
- Renders sheet music with abcjs.
- Provides playback controls when browser audio is available.

## Requirements

- Node.js 22
- npm 11
- Chrome or a Chromium-based browser for extension testing

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

Then load the generated extension output as an unpacked extension in Chrome. If content script HMR behaves inconsistently, reload the extension and the target page from `chrome://extensions`.

For a production-like build:

```sh
npm run build
```

Then load the `dist/` directory as an unpacked extension.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite/CRX development server. |
| `npm run build` | Build the production extension into `dist/`. |
| `npm run preview` | Preview the Vite build output. |
| `npm run audit` | Fail on high severity npm audit findings. |
| `npm run lint` | Run ESLint. |
| `npm run lint:fix` | Run ESLint with safe automatic fixes. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run test` | Run unit tests once. |
| `npm run test:watch` | Run unit tests in watch mode. |
| `npm run check` | Run the full local verification pipeline. |

## Project Structure

```text
src/background/   Chrome extension service worker
src/content/      Page detection, rendering, and content script styles
src/popup/        Extension popup UI
public/icons/     Extension icons copied into the build output
docs/             Project process and release documentation
```

## Development Standards

- Use ESLint only for code quality and lightweight style checks. Do not add Prettier unless the project explicitly changes direction.
- Keep `package-lock.json` committed for reproducible installs.
- Do not commit `dist/`, `node_modules/`, extension package archives, or signing keys.
- Add or update unit tests when changing ABC detection behavior.
- Run `npm run check` before opening a pull request or making a release commit.

## Privacy and Permissions

ChatMusic scans page content locally in the browser to find ABC notation. It does not send page text to a project-owned server. See [PRIVACY.md](PRIVACY.md) for details.

The extension currently uses abcjs soundfont loading for playback. Before public release, verify the configured soundfont host and permissions in [manifest.json](manifest.json).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, commit conventions, and required checks.

For AI-assisted changes, see [docs/ai-assisted-development.md](docs/ai-assisted-development.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Release

See [docs/release.md](docs/release.md) for the Chrome Web Store release checklist.

## License

MIT. See [LICENSE](LICENSE).