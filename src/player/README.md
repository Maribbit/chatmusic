# ChatMusic Player Module

This module owns the reusable score player used by both the browser content script and standalone Studio.

## Responsibilities

- Render ABC source into an isolated Shadow DOM score card.
- Coordinate abcjs visual rendering and audio playback.
- Own score controls such as fullscreen, source-code visibility, keyboard visibility, tempo, duration, SVG export, and MIDI export hooks.
- Keep player UI elements and tests close to the player implementation.

## Folder Map

- `renderer.ts` is the public orchestration facade used by `src/content/` and `src/studio/`.
- `types.ts` contains renderer-facing player contracts shared by internal player modules.
- `components/` contains Lit custom elements and DOM control adapters used by the player view.
- `playback/` contains synth setup, progress seeking, timing/source-highlight mapping, score highlight synchronization, tempo/duration helpers, and audio asset integration.
- `view/` contains Shadow DOM composition, score rendering/layout helpers, theme resolution, and player CSS.
- `exports/` contains player-specific export helpers and player export button actions.
- `quality.ts` contains rendered-score quality feedback actions.

## Non-Responsibilities

- Detecting ABC on host pages. That belongs in `src/content/detectors/`.
- Observing host-page DOM changes or extension enabled state. That belongs in `src/content/index.ts`.
- Studio editor state, layout, file import, and source persistence. Those belong in `src/studio/`.

`renderer.ts` should stay the stable public facade. Keep feature work in the focused player modules first, and use `renderer.ts` to coordinate render-instance lifecycle and exported player-wide update/remove APIs unless a new public player API is intentionally designed.