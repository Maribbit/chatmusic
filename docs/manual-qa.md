# Manual QA Checklist

Use this checklist before packaging a Chrome Web Store release.

## Setup

1. Run `npm run check`.
2. Run `npm run build` if it was not already run by the check command.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Load the generated `dist/` directory as an unpacked extension.
6. Open DevTools for the target page, the popup, and the service worker when checking console errors.

## Test Pages

Verify on at least these page types:

- A static page with one simple ABC code block.
- A static page with multiple ABC code blocks.
- A dynamic AI chat or chat-like page where content is appended after initial load.
- A page with non-ABC code blocks near ABC blocks.
- A long tune that exceeds the embedded score height.

## Detection And Rendering

- ABC blocks in `pre` and `code` elements are detected.
- Language-tagged ABC blocks render correctly.
- Content-detected ABC blocks render correctly.
- Non-ABC code blocks are ignored.
- Multiple ABC blocks on the same page each get one rendered score.
- Re-rendering does not duplicate existing ChatMusic containers.
- Updating dynamic page content adds new rendered scores without disturbing existing ones.
- Invalid ABC does not break the page or other rendered scores.

## Score UI

- Header controls fit without overlap at common desktop widths.
- The tempo menu opens, updates BPM display, and closes cleanly.
- The SVG export camera button downloads an `.svg` file with a sensible filename.
- Fullscreen opens and exits correctly.
- The keyboard toggle hides and shows the piano keyboard.
- The source toggle collapses and restores the original code block.
- Long scores scroll inside the embedded score area.
- Outer page scrolling still works when the pointer is over a long score.
- Fullscreen keeps the header, audio controls, and keyboard visible.

## Playback

- Audio controls initialize without console errors.
- Playback starts, pauses, restarts, and seeks with the progress control.
- Clicking a note seeks playback near that note.
- Current notes highlight in the rendered score during playback.
- The piano keyboard highlights active pitches during playback.
- Tempo changes update playback speed and BPM display.
- Total duration remains visible and sensible after tempo changes.
- Playback uses bundled `chrome-extension://` soundfont files.
- Playback does not request remote soundfont files from `paulrosen.github.io` or `gleitz.github.io` by default.

## Popup Settings

- Enable detection toggles rendering behavior for the active tab.
- Theme mode changes apply to existing rendered scores.
- Source code default visibility changes apply to rendered scores.
- Keyboard default visibility changes apply to rendered scores.
- Settings persist after refreshing the page.
- Popup interactions do not log unexpected errors when the active tab cannot receive messages.

## Themes And Accessibility

- Auto theme works on light pages.
- Auto theme works on dark pages.
- Forced light theme is readable on dark pages.
- Forced dark theme is readable on light pages.
- Toolbar buttons have accessible names and visible focus outlines.
- Keyboard navigation reaches popup controls and score header controls.

## Release Artifacts

- `dist/manifest.json` has the expected `version`.
- `dist/manifest.json` has no remote soundfont host permission.
- `dist/THIRD_PARTY_NOTICES.txt` is present.
- `dist/soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/` contains 88 MP3 files.
- Icons are present at 16, 48, and 128 pixels.
- Store screenshots match the current UI.
- Store privacy text matches [../PRIVACY.md](../PRIVACY.md).
- Store permission explanations match [store-listing.md](store-listing.md).

## Final Sign-Off

- No unexpected errors appear in the content page console.
- No unexpected errors appear in the popup console.
- No unexpected errors appear in the service worker console.
- `CHANGELOG.md` has a dated release section for the target version.
- The package archive contains only build output files needed for the extension.