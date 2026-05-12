# Privacy

ChatMusic is designed to run locally in the browser.

## Data Processed Locally

The content script scans page DOM content to find ABC notation in code blocks. This scanning happens locally in the browser tab. ChatMusic does not send page text, detected notation, browsing history, or rendered scores to a project-owned server.

## Storage

The extension may use Chrome extension storage for local preferences such as whether the extension is enabled and, in future versions, a selected soundfont source. These settings are not used for tracking.

## Network Requests

Playback uses abcjs soundfont assets. The browser may request soundfont files from the configured soundfont host when playback is initialized. Before release, verify the selected soundfont host and document it in the Chrome Web Store listing.

## Permissions

Permissions and host permissions are defined in [manifest.json](manifest.json). Keep them minimal and review any change for privacy impact.

## Contact

If the project adds a public issue tracker, privacy reports should be directed there unless a dedicated security contact is added.