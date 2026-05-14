# Privacy

ChatMusic is designed to run locally in the browser.

## Data Processed Locally

The content script scans page DOM content to find ABC notation in code blocks. This scanning happens locally in the browser tab. ChatMusic does not send page text, detected notation, browsing history, or rendered scores to a project-owned server.

## Storage

The extension may use Chrome extension storage for local preferences such as whether the extension is enabled and, in future versions, a selected soundfont source. These settings are not used for tracking.

## Network Requests

Default playback uses bundled piano soundfont samples packaged with the extension. It does not request remote soundfont files when audio playback is initialized.

## Permissions

Permissions and host permissions are defined in [manifest.json](manifest.json). Keep them minimal and review any change for privacy impact.

The extension exposes bundled soundfont audio files as web-accessible extension resources so the content script can load them for local playback.

## Contact

If the project adds a public issue tracker, privacy reports should be directed there unless a dedicated security contact is added.