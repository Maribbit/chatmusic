# ChatMusic Player Module

This module owns the reusable score player used by both the browser content script and standalone Studio.

## Responsibilities

- Render ABC source into an isolated Shadow DOM score card.
- Coordinate abcjs visual rendering and audio playback.
- Own score controls such as fullscreen, source-code visibility, keyboard visibility, tempo, duration, SVG export, and MIDI export hooks.
- Keep player UI elements and tests close to the player implementation.

## Folder Map

- `renderer.ts` is the public orchestration facade used by `src/content/` and `src/studio/`.
- `components/` contains Lit custom elements and DOM control adapters used by the player view.
- `playback/` contains playback-adjacent pure logic and audio asset integration.
- `view/` contains Shadow DOM composition, theme resolution, and player CSS.
- `exports/` contains player-specific export helpers.

## Non-Responsibilities

- Detecting ABC on host pages. That belongs in `src/content/detectors/`.
- Observing host-page DOM changes or extension enabled state. That belongs in `src/content/index.ts`.
- Studio editor state, layout, file import, and source persistence. Those belong in `src/studio/`.

The current `renderer.ts` file is still the main orchestration point. Future refactors should split it by behavior while preserving this module boundary: visual rendering, playback, source highlighting, exports, and render-instance lifecycle. Keep `renderer.ts` as the stable entry point unless a new public player API is intentionally designed.