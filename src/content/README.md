# ChatMusic Content Script Module

This module owns browser-page integration for the extension.

## Responsibilities

- Observe host-page DOM changes and extension setting changes.
- Detect ABC candidates through `detectors/`.
- Decide when to render, refresh, or remove ChatMusic player instances on the host page.

## Non-Responsibilities

- Score rendering, playback, player controls, Shadow DOM view code, and player UI components. Those belong in `src/player/`.
- Popup settings UI. That belongs in `src/popup/`.
- Extension-wide service worker behavior. That belongs in `src/background/`.

Keep content-script changes focused on host-page orchestration. If a change affects playback, score layout, controls, source highlighting, or export behavior, start in `src/player/` instead.