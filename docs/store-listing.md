# Chrome Web Store Listing Draft

## Name

ChatMusic - ABC Notation Renderer

## Short Description

Render ABC notation in chat and web code blocks as playable sheet music with local piano playback and SVG export.

## Detailed Description

ChatMusic detects ABC music notation in web page code blocks and renders it as readable, playable sheet music directly below the matching source block.

It is designed for AI chat apps, Markdown pages, documentation, forums, and other places where ABC notation appears as text. Instead of copying notation into a separate tool, you can view the score, play it back, inspect the source, and export the rendered SVG image in place.

Default playback uses bundled piano soundfont samples, so the extension does not need to request remote soundfont files when you press play.

## Key Features

- Detect ABC notation in `pre` and `code` blocks.
- Render notation as sheet music with abcjs.
- Play rendered tunes with local piano soundfont samples.
- Highlight currently playing notes in the score.
- Show an 88-key piano keyboard visualization during playback.
- Click notes in the score to seek playback.
- View long tunes in a bounded scrollable score area.
- Enter fullscreen for practice or review.
- Switch rendered score theme between automatic, light, and dark modes.
- Collapse or show the original source code block.
- View tempo and total playback duration.
- Export the rendered score as an SVG image.

## Privacy Summary

ChatMusic processes page content locally in your browser. It scans code blocks on the current page to find ABC notation, but it does not send page text, detected notation, browsing history, or rendered scores to a project-owned server.

User preferences are stored with Chrome extension storage. These settings are used only to remember extension behavior such as enabled state, theme mode, source visibility, and keyboard visibility.

Default playback uses bundled piano soundfont samples packaged with the extension. It does not request remote soundfont files.

## Permission Rationale

- `storage`: Saves local extension preferences.
- `activeTab`: Lets the popup apply setting changes to the current tab.
- Content script access to all URLs: Allows ChatMusic to detect ABC notation in code blocks across supported websites. Detection happens locally in the browser tab.
- Web-accessible soundfont resources: Allows the content script to load bundled piano audio samples for local playback.

## Screenshot Plan

1. ABC notation in an AI chat or Markdown code block with the rendered score below it.
2. Dark theme page showing automatic rendered score theme support.
3. Playback controls with note highlighting and the piano keyboard visualization.
4. A long tune inside the bounded score area.
5. Fullscreen score view.
6. Header controls showing tempo, SVG export, fullscreen, keyboard toggle, and source toggle.
7. Popup settings for detection, theme, source visibility, and keyboard visibility.

## Third-Party Assets

Bundled piano soundfont attribution is documented in [../public/THIRD_PARTY_NOTICES.txt](../public/THIRD_PARTY_NOTICES.txt).