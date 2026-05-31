# Changelog

All notable changes to ChatMusic are documented in this file.

This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. Extension releases use the same numeric version in `package.json` and `manifest.json`.

## [Unreleased]

### Added

- Added "About ChatMusic" info dialog in Studio, featuring author information and handy links to MusicXML web converters.
- Rendered ABC scores now automatically wrap systems to the available score pane width, improving readability for long generated or converted ABC sources.
- Studio now has a source editor line-wrap toggle for long ABC lines.
- Studio playback now highlights the corresponding ABC source range while notes play.
- Studio now links to external MusicXML/ABC conversion tools instead of running an incomplete built-in MusicXML converter.

### Changed

- Restructured Studio Editor into a VS Code-style tier layout with a slim status and diagnostic footer instead of interleaving error panels in the content flow.
- Refined Studio UI spacing with a compact main header and editor toolbar spacing.

### Removed

- Built-in MusicXML/MXL import was removed so ChatMusic can stay focused on reliable ABC editing, validation, rendering, playback, and export workflows.

### Fixed

- ABC parser warning panels in rendered score cards now render as complete block panels instead of fragmented inline borders, and long abcjs messages wrap inside the card.
- Popup detection toggles now apply immediately to the active tab, including pages that were open before the extension loaded or reloaded.
- Playback progress bars now seek continuously while dragging, including before the first playback starts.
- Studio source editor now uses a light code background in light mode instead of keeping the dark editor palette.
- Studio editor toolbar status text now progressively hides at narrow pane widths so the action buttons stay aligned without adding vertical space.
- Studio split panes now keep narrow editor contents clipped to the editor pane instead of letting the source area overlap the preview.
- Studio ABC source editor now fills the available pane height when the quality panel is hidden.
- Playback no longer starts an automatic full-piano soundfont warmup that could leave abcjs note caches in a failed state after transient sample-load errors.

## [0.3.0] - 2026-05-26

### Added

- Independent Studio workspace (`src/studio`) for pasting, validating, and rendering ABC notation directly, with support for offline web deployment.
- Virtual piano keyboard sound interaction (click-to-play) via built-in soundfont.
- "Open in Studio" integration from content-script rendered scores to seamlessly move AI-generated music to the standalone editor.
- MIDI export from rendered score controls in chats and Studio.
- ABC source file import and export in Studio.
- Automatic ABC source warning checks in Studio using abcjs parser warnings, with a toggle to turn auto-checking off.
- Automatic ABC parser warning feedback in rendered score previews, with copyable repair prompts for AI chats.
- MusicXML import in Studio for converting `.musicxml`, `.xml`, and compressed `.mxl` scores into ABC.

### Changed
- Web and extension dual-build architecture (`vite.web.config.ts`), allowing Studio to be hosted as a standalone website.

## [0.2.0] - 2026-05-14

### Added

- Popup theme mode control for automatic, light, and dark rendered score themes.
- Automatic rendered score theme detection based on the host page background.
- Fullscreen control for enlarging rendered scores during practice.
- Playback note highlighting and note click seeking in rendered scores.
- Playback piano keyboard visualization that highlights current MIDI pitches, with configurable default visibility.
- Tempo menu BPM readout based on the rendered ABC tune and current playback speed.
- Total playback duration display next to the audio progress clock.
- SVG score image export from the rendered score header.
- Bundled local piano soundfont samples for default playback without remote soundfont requests.
- Bounded embedded score scrolling for long tunes while keeping fullscreen controls visible.
- Source code collapse controls with configurable default visibility.
- Changelog and version consistency checks for release preparation.

### Changed

- Rendered scores use isolated theme styles inside the Shadow DOM.
- Rendered score controls use a compact header with fullscreen and tempo controls.
- Playback now defaults to a local piano soundfont and no longer needs the remote soundfont host permission.

## [0.1.0] - 2026-05-13

### Added

- Initial Chrome extension MVP for detecting ABC notation in page code blocks.
- abcjs sheet music rendering and playback controls.
- Popup setting for enabling or disabling detection.