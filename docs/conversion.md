# Format Conversion

ChatMusic supports local format conversion for workflows where ABC notation is easier to exchange with AI tools than binary or app-specific score files.

## Current Capabilities

- **ABC to MIDI**: rendered scores can be downloaded as `.mid` files from the score toolbar. This uses abcjs' built-in MIDI generator and does not introduce a separate MIDI implementation.
- **ABC source files**: Studio can open `.abc` and `.txt` files, and can save the current source as a `.abc` file.
- **MusicXML to ABC**: Studio can import `.musicxml`, `.xml`, and compressed `.mxl` files and convert them to ABC in the editor. The converter runs fully in the browser and does not upload score content.

Compressed `.mxl` files are unpacked locally in the browser and then passed through the same MusicXML converter.

## Why The MusicXML Converter Is Local

The MusicXML importer in [src/shared/musicxml-to-abc.ts](../src/shared/musicxml-to-abc.ts) is a small, project-owned converter rather than a bundled copy of `xml2abc`.

The main reasons are:

- The available npm `xml2abc` package is licensed under LGPL-3.0. That may be usable, but bundling it into a Chrome extension requires more careful license compliance than this project currently needs.
- The package exposes a global `vertaal` function and assumes a jQuery-style API. That shape is harder to type, test, and isolate in the extension/web dual build.
- ChatMusic currently needs a predictable import subset for AI exchange, not a full professional engraving converter.

This avoids copying third-party conversion code into the MIT-licensed source tree. If the project later adopts an LGPL converter, document the compliance model first and keep it behind a narrow adapter.

## Supported MusicXML Subset

The converter is designed for simple, useful score exchange:

- `score-partwise` MusicXML documents.
- Score title from `work-title`, `movement-title`, or `credit-words`.
- Part names from `part-list`.
- Divisions, key signatures, and time signatures.
- Notes, rests, chords, and basic durations.
- Multiple parts and multiple voices.
- `backup` and `forward` timeline offsets, including rest insertion for delayed voices.
- Major and minor keys represented by circle-of-fifths values.
- Basic accidentals from integer `alter` values.

## Known Limits

The importer is not a complete MusicXML implementation. These areas should be treated as future work or explicitly tested before expanding user promises:

- `score-timewise` documents.
- Lyrics, articulations, dynamics, ornaments, slurs, tuplets, beams, repeats, layout, page formatting, and advanced engraving details.
- Clef-aware octave transposition and multi-staff piano layout preservation.
- Microtonal or fractional accidentals.
- Complex overlapping voices beyond the simple timeline model.

When in doubt, prefer a conservative import result that remains valid ABC over a visually ambitious conversion that may be misleading.

## Testing Expectations

Conversion logic should stay isolated from Studio UI code. Add tests in [src/shared/musicxml-to-abc.test.ts](../src/shared/musicxml-to-abc.test.ts) for MusicXML semantics and [src/shared/musicxml-file.test.ts](../src/shared/musicxml-file.test.ts) for file handling.

At minimum, new converter behavior should verify:

- The produced ABC contains the expected musical tokens.
- The produced ABC can be parsed by abcjs with `parseOnly`.
- Unsupported input fails with `MusicXmlConversionError` and an actionable message.
- Timeline behavior involving `backup` and `forward` remains covered.

Run `npm run check` after conversion changes.