import { describe, expect, it } from "vitest";
import { detectAbc, scanForAbc } from "./detector";

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

describe("detectAbc", () => {
  it("detects ABC notation from a code language class", () => {
    const pre = createPre(`<code class="language-abc">${validAbc}</code>`);

    expect(detectAbc(pre)).toEqual({
      abcText: validAbc,
      element: pre,
      method: "tag",
    });
  });

  it("detects ABC notation from a pre data-language attribute", () => {
    const pre = createPre(validAbc);
    pre.setAttribute("data-language", "abc");

    expect(detectAbc(pre)?.method).toBe("tag");
  });

  it("detects ABC notation by content headers", () => {
    const pre = createPre(validAbc);

    expect(detectAbc(pre)?.method).toBe("content");
  });

  it("rejects content without the mandatory key header", () => {
    const pre = createPre(`X:1
T:Missing Key
M:4/4
CDEF GABc`);

    expect(detectAbc(pre)).toBeNull();
  });

  it("rejects untagged content without an extra confidence header", () => {
    const pre = createPre(`X:1
K:C
CDEF GABc`);

    expect(detectAbc(pre)).toBeNull();
  });

  it("rejects non-ABC code blocks", () => {
    const pre = createPre(`<code class="language-ts">const key = "C";</code>`);

    expect(detectAbc(pre)).toBeNull();
  });
});

describe("scanForAbc", () => {
  it("returns all matching pre elements in a DOM subtree", () => {
    const root = document.createElement("main");
    const first = createPre(validAbc);
    const second = createPre(`<code class="language-abc">${validAbc}</code>`);
    const ignored = createPre(`<code class="language-js">console.log("hello")</code>`);

    root.append(first, ignored, second);

    expect(scanForAbc(root)).toEqual([
      { abcText: validAbc, element: first, method: "content" },
      { abcText: validAbc, element: second, method: "tag" },
    ]);
  });
});