# Format Conversion

ChatMusic is ABC-first. It opens, validates, renders, plays, and exports ABC; it does not ship MusicXML/MXL import or conversion code.

## Current Capabilities

- Studio opens `.abc` and `.txt` source files and saves the current source as `.abc`.
- Rendered scores can be exported as SVG and MIDI.
- ABC from hand writing, AI output, or external converters can be checked, wrapped, rendered, played, and exported.

## External MusicXML/ABC Links

MusicXML conversion stays outside this repository. Recommended tools:

- [xml2abc-js](https://wim.vree.org/js/xml2abc-js_index.html) for browser-based MusicXML to ABC conversion.
- [xml2abc](https://wim.vree.org/svgParse/xml2abc.html) for command-line MusicXML to ABC conversion.
- [abc2xml](https://wim.vree.org/svgParse/abc2xml.html) for ABC to MusicXML conversion.

The supported workflow is: convert externally, paste or open the resulting ABC in Studio, then use ChatMusic for diagnostics, rendering, wrapping, playback, SVG export, and MIDI export.

Do not add converter code or converter assets without a separate design and license review. The project boundary remains ABC tooling plus external conversion links.

## Testing Expectations

Conversion-specific tests are not part of ChatMusic. Format-adjacent changes should verify:

- ABC open/save behavior in [src/shared/abc-file.test.ts](../src/shared/abc-file.test.ts).
- ABC parser diagnostics in [src/shared/abc-quality/validate.test.ts](../src/shared/abc-quality/validate.test.ts).
- Player rendering/export behavior in [src/player/renderer.test.ts](../src/player/renderer.test.ts) and [src/player/exports/svg-export.test.ts](../src/player/exports/svg-export.test.ts).
- Studio render flow in [src/studio/rendering.test.ts](../src/studio/rendering.test.ts).

Run `npm run check` after user-facing conversion workflow changes.