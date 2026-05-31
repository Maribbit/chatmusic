# ABC Detector Module

This module owns ChatMusic's content-script ABC detection. The public entry point remains `src/content/detector.ts`, which re-exports this module so callers do not need to know the internal detector layout.

## Structure

- `index.ts` runs registered detectors in priority order and removes nested duplicate detections.
- `generic.ts` handles portable Markdown-style `<pre>` and `<code>` blocks using ABC language tags or conservative ABC header matching.
- `providers/` contains provider-specific detectors for renderers whose language metadata or source text lives outside a normal `<pre><code>` shape.
- `utils.ts` contains shared DOM, language, and ABC content helpers.
- `types.ts` defines the detector contract.

All detector tests live in this folder. Generic behavior is covered by `generic.test.ts`, detector orchestration is covered by `index.test.ts`, and provider fixtures live next to their provider implementation in `providers/`.

## Adding Or Updating A Provider

When a provider changes its code-block HTML, update the matching file in `providers/` and its provider-specific test.

1. Put the provider's real rendered HTML snippet in a provider test file, preserving the important wrapper classes, language label position, and source-code structure.
2. Assert the extracted `abcText`, `method`, `provider`, and render anchor `element`.
3. Implement the smallest provider detector that recognizes that provider's stable wrapper and extracts text from the intended code block.
4. Keep provider detectors ahead of `genericDetector` in `index.ts` when they should own the render anchor.
5. Run the provider test first, then `npm run check` to protect existing providers and generic detection.

Provider detectors should avoid hashed classes unless those hashes are the only available signal in the supplied HTML. Prefer stable wrapper names, semantic attributes, language labels, and DOM relationships.

Current provider-specific detectors:

- `deepseek.ts` anchors on DeepSeek's `.md-code-block` wrapper when the banner contains an ABC language label.
- `gemini.ts` anchors on Gemini's `code-block` element and extracts source from `code[data-test-id="code-content"]`.