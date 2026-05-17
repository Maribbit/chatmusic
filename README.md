# ChatMusic

ChatMusic is a Chrome extension that detects ABC notation in web page code blocks, renders the matching score below the block, and provides piano-style playback through abcjs.

The project is currently an MVP moving toward an open-source, Chrome Web Store ready extension. It also includes a standalone Studio page that can be built as a static web app from the same codebase.

## Features

- Detects ABC notation in `<pre>` and `<code>` blocks.
- Supports language-tag detection such as `language-abc` and `data-language="abc"`.
- Falls back to content detection using required ABC headers.
- Renders sheet music with abcjs.
- Provides playback controls when browser audio is available.
- Uses bundled piano soundfont samples for default playback without remote soundfont requests.
- Highlights playback notes and shows an 88-key piano keyboard visualization.
- Offers theme controls, fullscreen viewing, source collapse, tempo display, duration display, SVG score export, and MIDI export.
- Includes ChatMusic Studio for opening/saving ABC files, importing MusicXML/MXL, rendering it live, and opening detected scores in the Studio.

## Requirements

- Node.js 22
- npm 11
- Chrome or a Chromium-based browser for extension testing

## Compatibility

The extension expects ABC notation to be rendered inside standard `<pre>` and `<code>` blocks. It has been tested and confirmed to work on the following AI chat platforms:

- **Supported**:
  - Google Gemini
  - Kimi
  - DeepSeek
- **Not currently supported**:
  - GLM (Zhipu) - Uses a non-standard code block rendering structure that the extension currently does not detect.

## Setup

```sh
npm install
```

## Development

For extension development:

```sh
npm run dev:extension
```

Keep the Vite dev server running, then load the generated `dist/` directory as an unpacked extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked** and select this project's `dist/` directory.
4. Open or refresh a target web page and test the extension there.

The CRX/Vite plugin writes a development manifest into `dist/` and injects HMR loaders for the background service worker, popup, and content script. Popup and background changes are usually picked up by the dev server automatically. Content script updates may still need the target page to be refreshed; if the extension context becomes stale, reload the extension from `chrome://extensions` and then refresh the target page.

For a production-like build:

```sh
npm run build:extension
```

Then load the `dist/` directory as an unpacked extension.

For standalone Studio web development:

```sh
npm run dev:web
```

For a production web build:

```sh
npm run build:web
```

The web build writes to `dist-web/`. Set `CHATMUSIC_WEB_BASE` when deploying under a subpath, for example `CHATMUSIC_WEB_BASE=/chatmusic/ npm run build:web`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the default extension development server. |
| `npm run dev:extension` | Start the Vite/CRX extension development server. |
| `npm run dev:web` | Start the standalone Studio web development server. |
| `npm run build` | Build the production extension into `dist/`. |
| `npm run build:extension` | Build the production extension into `dist/`. |
| `npm run build:web` | Build the standalone Studio web app into `dist-web/`. |
| `npm run preview` | Preview the extension Vite build output. |
| `npm run preview:web` | Preview the standalone Studio web build output. |
| `npm run audit` | Fail on high severity npm audit findings. |
| `npm run lint` | Run ESLint. |
| `npm run lint:fix` | Run ESLint with safe automatic fixes. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run test` | Run unit tests once. |
| `npm run test:watch` | Run unit tests in watch mode. |
| `npm run release:package` | Build, validate, and package the Chrome extension zip for the current version. |
| `npm run check` | Run the full local verification pipeline. |

## Project Structure

```text
src/background/   Chrome extension service worker
src/content/      Page detection, rendering, and content script styles
src/popup/        Extension popup UI
src/shared/       Cross-target adapters and shared settings helpers
src/studio/       Studio page shared by the extension and standalone web build
public/icons/     Extension icons copied into the build output
public/soundfonts/ Bundled piano soundfont samples used by abcjs playback
docs/             Project process and release documentation
```

## Development Standards

- Use ESLint only for code quality and lightweight style checks. Do not add Prettier unless the project explicitly changes direction.
- Keep `package-lock.json` committed for reproducible installs.
- Do not commit `dist/`, `dist-web/`, `node_modules`, extension package archives, or signing keys.
- Add or update unit tests when changing ABC detection behavior.
- Run `npm run check` before opening a pull request or making a release commit.
- Keep extension/web shared logic behind the adapters documented in [docs/dual-build.md](docs/dual-build.md).
- Keep format conversion behavior and limitations documented in [docs/conversion.md](docs/conversion.md).
- Keep future ABC quality tooling aligned with [docs/abc-quality-tools.md](docs/abc-quality-tools.md).

## Privacy and Permissions

ChatMusic scans page content locally in the browser to find ABC notation. It does not send page text to a project-owned server. Default playback uses bundled piano soundfont samples instead of requesting remote soundfont files. See [PRIVACY.md](PRIVACY.md) for details.

Bundled soundfont attribution is documented in [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, commit conventions, and required checks.

For AI-assisted changes, see [docs/ai-assisted-development.md](docs/ai-assisted-development.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Release

See [docs/release.md](docs/release.md) for the Chrome Web Store release checklist.

## License

MIT. See [LICENSE](LICENSE).