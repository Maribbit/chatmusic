import { describe, expect, it } from "vitest";
import { scanForAbc } from "..";
import { geminiDetector } from "./gemini";

const geminiAbc = `X: 1
T: Fast Jazz Piano Blues
C: F Major 12-Bar Blues
M: 4/4
L: 1/8
Q: "Fast Swing" 1/4=180
K: F
%%staves {1 2}
V: 1 clef=treble name="Right Hand"
V: 2 clef=bass name="Left Hand"
%
[V:1] z C FA c^c d=B | c_e d_d c A F2 | z C FA c^c d=B | c A2 F- F4 |
[V:2] F,,2 A,,2 C,2 _E,2 | B,,2 D,2 F,2 _A,2 | F,,2 A,,2 C,2 _E,2 | F,2 _E,2 D,2 _D,2 |
%
[V:1] z2 f2 d2 cB | G_A G F D2 F2 | z C FA c^c d=B | c A2 F- F4 |
[V:2] B,,2 D,2 F,2 _A,2 | B,,2 D,2 F,2 _A,2 | F,,2 A,,2 C,2 _E,2 | F,2 _E,2 D,2 C,2 |
%
[V:1] z g2 f d2 c2 | _e d c A G2 F2 | z C FA c d f a | g f d c- c4 |]
[V:2] C,2 E,2 G,2 B,2 | B,,2 D,2 F,2 _A,2 | F,,2 A,,2 C,2 _E,2 | C,2 E,2 G,2 B,2 |]`;

const geminiCodeBlockHtml = `<structured-content-container class="model-response-text has-thoughts processing-state-visible ng-star-inserted"><div class="container"><message-content id="message-content-id-r_2f78ef04ef3da2c8" class="ng-star-inserted"><div inline-copy-host class="markdown markdown-main-panel stronger enable-updated-hr-color" id="model-response-message-contentr_2f78ef04ef3da2c8" aria-live="off" aria-busy="false" dir="ltr"><response-element class="" ng-version="0.0.0-PLACEHOLDER"><code-block class="ng-tns-c2725152751-16 enable-luminous-code-block ng-star-inserted"><div class="code-block ng-tns-c2725152751-16 ng-animate-disabled ng-trigger ng-trigger-codeBlockRevealAnimation" jslog="223238;track:impression,attention" data-hveid="3" style="display: block;"><div class="formatted-code-block-internal-container ng-tns-c2725152751-16"><div class="animated-opacity ng-tns-c2725152751-16"><div class="code-block-decoration header-formatted gds-emphasized-body-m ng-tns-c2725152751-16 ng-star-inserted"><span class="ng-tns-c2725152751-16">Code snippet</span><div class="buttons ng-tns-c2725152751-16 ng-star-inserted"><gem-icon-button tabindex="-1" type="onSurface" size="small" theme="lm" arialabel="Download code" gemtooltip="Download code" class="download-button gem-button"><button aria-label="Download code"><gem-icon><mat-icon data-mat-icon-name="arrow_circle_down" fonticon="arrow_circle_down"></mat-icon></gem-icon></button></gem-icon-button><gem-icon-button tabindex="-1" type="onSurface" size="small" theme="lm" arialabel="Copy code" gemtooltip="Copy code" data-test-id="gem-copy-button" class="copy-button gem-button"><button aria-label="Copy code"><gem-icon><mat-icon data-mat-icon-name="copy" fonticon="copy"></mat-icon></gem-icon></button></gem-icon-button></div></div><pre class="ng-tns-c2725152751-16"><code role="text" data-test-id="code-content" class="code-container formatted ng-tns-c2725152751-16">${geminiAbc}
</code></pre></div></div></div></code-block></response-element></div></message-content></div></structured-content-container>`;

function createRoot(html: string): HTMLElement {
  const root = document.createElement("main");
  root.innerHTML = html;
  return root;
}

describe("geminiDetector", () => {
  it("detects ABC code in Gemini code-block elements", () => {
    const root = createRoot(geminiCodeBlockHtml);
    const result = geminiDetector.scan(root)[0];

    expect(result).toMatchObject({
      abcText: geminiAbc,
      method: "content",
      provider: "gemini",
    });
    expect(result.element).toBe(root.querySelector("code-block"));
  });

  it("keeps Gemini blocks as one scan result instead of also returning nested pre", () => {
    const root = createRoot(geminiCodeBlockHtml);

    const results = scanForAbc(root);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      abcText: geminiAbc,
      method: "content",
      provider: "gemini",
    });
    expect(results[0].element).toBe(root.querySelector("code-block"));
  });
});
