# Changelog

All notable changes to ChatMusic are documented in this file.

This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. Extension releases use the same numeric version in `package.json` and `manifest.json`.

## [Unreleased]

### Added

- Popup theme mode control for automatic, light, and dark rendered score themes.
- Automatic rendered score theme detection based on the host page background.
- Fullscreen control for enlarging rendered scores during practice.
- Playback note highlighting and note click seeking in rendered scores.
- Playback piano keyboard visualization that highlights current MIDI pitches, with configurable default visibility.
- Tempo menu BPM readout based on the rendered ABC tune and current playback speed.
- Total playback duration display next to the audio progress clock.
- Bounded embedded score scrolling for long tunes while keeping fullscreen controls visible.
- Source code collapse controls with configurable default visibility.
- Changelog and version consistency checks for release preparation.

### Changed

- Rendered scores use isolated theme styles inside the Shadow DOM.
- Rendered score controls use a compact header with fullscreen and tempo controls.

## [0.1.0] - 2026-05-13

### Added

- Initial Chrome extension MVP for detecting ABC notation in page code blocks.
- abcjs sheet music rendering and playback controls.
- Popup setting for enabling or disabling detection.