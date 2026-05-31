# ChatMusic Studio

This folder owns the standalone ABC editing workspace.

## Responsibilities

- Wire Studio DOM controls, settings, source persistence, and render lifecycle.
- Keep editor-only behavior separate from the reusable player in `src/player/`.
- Provide lightweight tests for source highlighting, quality reporting, split layout behavior, source actions, presentation helpers, and render orchestration.

## Folder Map

- `studio.ts` is the entry-point wiring layer for DOM events and persisted settings.
- `rendering.ts` owns debounced render scheduling and calls into the public player facade.
- `source-highlight.ts` maps player source-highlight ranges back into the editable source mirror.
- `quality-report.ts` renders Studio ABC diagnostics below the editor.
- `split-layout.ts` owns responsive split-pane sizing, persistence, and resizer input.
- `source-actions.ts` owns source stats, clipboard, ABC import, and ABC export actions.
- `presentation.ts` owns small editor wrap, theme, and layout class helpers.

## Non-Responsibilities

- ABC detection on chat pages belongs in `src/content/detectors/`.
- Reusable score rendering, playback, and player controls belong in `src/player/`.
- Shared ABC import/export primitives belong in `src/shared/`.