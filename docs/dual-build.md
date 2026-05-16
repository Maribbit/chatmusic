# Dual Build Architecture

ChatMusic ships from one codebase to two front-end targets:

- **Chrome extension**: detects ABC notation on third-party pages and opens the packaged Studio page from the popup or rendered score toolbar.
- **Web Studio**: builds the Studio as a standalone static site that can be deployed without extension APIs.

The two targets should share rendering, audio, keyboard, export, theme, and Studio UI code. Target-specific behavior belongs behind small adapters.

## Build Targets

| Target | Command | Config | Output |
| --- | --- | --- | --- |
| Chrome extension | `npm run build:extension` | [vite.config.ts](../vite.config.ts) | `dist/` |
| Web Studio | `npm run build:web` | [vite.web.config.ts](../vite.web.config.ts) | `dist-web/` |

`npm run check` verifies both production builds. Keep `dist/` and `dist-web/` out of commits.

For local development:

```sh
npm run dev:extension
npm run dev:web
```

The default `npm run dev` remains the extension dev server for compatibility with the original workflow.

## Shared Boundaries

Use these shared modules whenever code needs to cross the extension/web boundary:

- [src/shared/assets.ts](../src/shared/assets.ts): resolves static assets through `chrome.runtime.getURL` in the extension and through Vite `base` in web builds.
- [src/shared/extension-runtime.ts](../src/shared/extension-runtime.ts): safely detects optional Chrome extension runtime and storage APIs.
- [src/shared/studio-url.ts](../src/shared/studio-url.ts): creates and parses Studio URLs that carry ABC source in the hash.
- [src/shared/messages.ts](../src/shared/messages.ts): defines and validates extension runtime messages.
- [src/studio/settings-store.ts](../src/studio/settings-store.ts): loads Studio settings from `chrome.storage.sync` in the extension and `localStorage` on the web.

Do not call `chrome.runtime`, `chrome.storage`, or `chrome.tabs` from shared renderer or Studio code directly. Extension-only entry points such as [src/background/service-worker.ts](../src/background/service-worker.ts) and [src/popup/popup.ts](../src/popup/popup.ts) may use Chrome APIs.

## Static Assets

Icons and bundled soundfont files live under [public/](../public/). Both builds copy these files into their output directories.

When code needs an asset path, use `getAssetUrl()` instead of hard-coding extension URLs. This is especially important for abcjs soundfonts because extension builds need `chrome-extension://...` URLs while web builds need ordinary site-relative URLs that honor Vite `base`.

For subpath web deployments such as GitHub Pages, set the base path when building:

```sh
CHATMUSIC_WEB_BASE=/chatmusic/ npm run build:web
```

## Studio URL Handoff

Rendered scores can open Studio with the current ABC source. Content code sends an `OPEN_STUDIO` message, and the background worker opens the packaged Studio page. The ABC text is encoded in the URL hash so the Studio can initialize without a backend.

The web Studio can use the same hash format, which keeps future sharing and deep-link work compatible with the extension implementation.

## Testing Expectations

Dual-build safety depends on narrow adapter tests:

- Asset URL resolution must cover extension and web paths.
- Studio URL/hash helpers must round-trip ABC source.
- Extension messages must reject malformed payloads.
- Studio settings storage must cover both `chrome.storage.sync` and `localStorage`.
- Soundfont options must keep pointing to the bundled piano soundfont directory.

Add tests near the adapter or module being changed. Run `npm run check` before committing dual-build changes.