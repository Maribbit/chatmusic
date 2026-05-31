import { describe, expect, it } from "vitest";
import { scanForAbc } from ".";

function createPre(html: string): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.innerHTML = html;
  return pre;
}

const validAbc = `X:1
T:Simple Tune
M:4/4
L:1/8
K:C
CDEF GABc`;

describe("scanForAbc", () => {
  it("returns all matching pre elements in a DOM subtree", () => {
    const root = document.createElement("main");
    const first = createPre(validAbc);
    const second = createPre(`<code class="language-abc">${validAbc}</code>`);
    const ignored = createPre(
      `<code class="language-js">console.log("hello")</code>`,
    );

    root.append(first, ignored, second);

    expect(scanForAbc(root)).toEqual([
      {
        abcText: validAbc,
        element: first,
        method: "content",
        provider: "generic",
      },
      {
        abcText: validAbc,
        element: second,
        method: "tag",
        provider: "generic",
      },
    ]);
  });
});
