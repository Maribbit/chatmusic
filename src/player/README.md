# ChatMusic Player Module

This module owns the reusable score player used by both the browser content script and standalone Studio.

## Responsibilities

- Render ABC source into an isolated Shadow DOM score card.
- Coordinate abcjs visual rendering and audio playback.
- Own score controls such as fullscreen, source-code visibility, keyboard visibility, tempo, duration, SVG export, and MIDI export hooks.
- Keep player UI elements and tests close to the player implementation.

## Non-Responsibilities

- Detecting ABC on host pages. That belongs in `src/content/detectors/`.
- Observing host-page DOM changes or extension enabled state. That belongs in `src/content/index.ts`.
- Studio editor state, layout, file import, and source persistence. Those belong in `src/studio/`.

The current `renderer.ts` file is still the main orchestration point. Future refactors should split it by behavior while preserving this module boundary: visual rendering, playback, source highlighting, exports, and render-instance lifecycle.