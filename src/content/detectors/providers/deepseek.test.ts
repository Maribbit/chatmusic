import { describe, expect, it } from "vitest";
import { scanForAbc } from "..";
import { deepSeekDetector } from "./deepseek";

const deepSeekAbc = `X:1
T:Piano Sketch
M:4/4
L:1/8
K:C
V:1 treble
V:2 bass
[V:1] |: c2 e2 g2 c'2 | d'2 g2 e2 c2 | c'2 a2 f2 d2 | g2 e2 c4 :|
[V:2] |: C,2 C,2 C,2 C,2 | G,,2 G,,2 G,,2 G,,2 | F,,2 F,,2 F,,2 F,,2 | C,2 C,2 C,4 :|`;

const deepSeekCodeBlockHtml = `<div class="md-code-block md-code-block-dark"><div class="md-code-block-banner-wrap"><div class="md-code-block-banner md-code-block-banner-lite"><div class="_121d384"><div class="d2a24f03"><span class="d813de27">abc</span></div><div class="d2a24f03 _246a029"><div class="efa13877"><button role="button" aria-disabled="false" class="ds-atom-button ds-text-button ds-text-button--with-icon" style="margin-right: 4px;"><div class="ds-icon ds-atom-button__icon" style="font-size: 16px; width: 16px; height: 16px; margin-right: 3px;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4h6v8H6z" fill="currentColor"></path></svg></div><span><span class="code-info-button-text">复制</span></span><div class="ds-focus-ring"></div></button><button role="button" aria-disabled="false" class="ds-atom-button ds-text-button ds-text-button--with-icon"><div class="ds-icon ds-atom-button__icon" style="font-size: 16px; width: 16px; height: 16px; margin-right: 3px;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1v10" stroke="currentColor"></path></svg></div><span><span class="code-info-button-text">下载</span></span><div class="ds-focus-ring"></div></button></div></div></div></div></div><pre><span>X:1</span>
<span>T:Piano Sketch</span>
<span>M:4/4</span>
<span>L:1/8</span>
<span>K:C</span>
<span>V:1 treble</span>
<span>V:2 bass</span>
<span>[V:1] |: c2 e2 g2 c'2 | d'2 g2 e2 c2 | c'2 a2 f2 d2 | g2 e2 c4 :|</span>
<span>[V:2] |: C,2 C,2 C,2 C,2 | G,,2 G,,2 G,,2 G,,2 | F,,2 F,,2 F,,2 F,,2 | C,2 C,2 C,4 :|</span></pre><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" class="_9bc997d _33882ae"><path d="M0 0C0 6.62742 5.37258 12 12 12L0 12L0 0Z" fill="currentColor"></path></svg><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" class="_9bc997d _28d7e84"><path d="M0 0C0 6.62742 5.37258 12 12 12L0 12L0 0Z" fill="currentColor"></path></svg></div>`;

function createRoot(html: string): HTMLElement {
  const root = document.createElement("main");
  root.innerHTML = html;
  return root;
}

describe("deepSeekDetector", () => {
  it("detects ABC code when DeepSeek renders the language label outside pre", () => {
    const root = createRoot(deepSeekCodeBlockHtml);
    const result = deepSeekDetector.scan(root)[0];

    expect(result).toMatchObject({
      abcText: deepSeekAbc,
      method: "tag",
      provider: "deepseek",
    });
    expect(result.element).toBe(root.querySelector(".md-code-block"));
  });

  it("keeps DeepSeek blocks as one scan result instead of also returning nested pre", () => {
    const root = createRoot(deepSeekCodeBlockHtml);

    const results = scanForAbc(root);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      abcText: deepSeekAbc,
      method: "tag",
      provider: "deepseek",
    });
    expect(results[0].element).toBe(root.querySelector(".md-code-block"));
  });
});
