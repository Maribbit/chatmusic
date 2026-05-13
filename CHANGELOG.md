# Changelog

All notable changes to ChatMusic are documented in this file.

This project follows a lightweight [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. Extension releases use the same numeric version in `package.json` and `manifest.json`.

## [Unreleased]

### Added

- Popup theme mode control for automatic, light, and dark rendered score themes.
- Automatic rendered score theme detection based on the host page background.
- Changelog and version consistency checks for release preparation.

### Changed

- Rendered scores use isolated theme styles inside the Shadow DOM.

## [0.1.0] - 2026-05-13

### Added

- Initial Chrome extension MVP for detecting ABC notation in page code blocks.
- abcjs sheet music rendering and playback controls.
- Popup setting for enabling or disabling detection.