import { describe, expect, it } from "vitest";
import { detectGenericAbc } from "./generic";

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

describe("detectGenericAbc", () => {
  it("detects ABC notation from a code language class", () => {
    const pre = createPre(`<code class="language-abc">${validAbc}</code>`);

    expect(detectGenericAbc(pre)).toEqual({
      abcText: validAbc,
      element: pre,
      method: "tag",
      provider: "generic",
    });
  });

  it("detects ABC notation from a pre data-language attribute", () => {
    const pre = createPre(validAbc);
    pre.setAttribute("data-language", "abc");

    expect(detectGenericAbc(pre)?.method).toBe("tag");
  });

  it("detects ABC notation by content headers", () => {
    const pre = createPre(validAbc);

    expect(detectGenericAbc(pre)?.method).toBe("content");
  });

  it("rejects content without the mandatory key header", () => {
    const pre = createPre(`X:1
T:Missing Key
M:4/4
CDEF GABc`);

    expect(detectGenericAbc(pre)).toBeNull();
  });

  it("rejects untagged content without an extra confidence header", () => {
    const pre = createPre(`X:1
K:C
CDEF GABc`);

    expect(detectGenericAbc(pre)).toBeNull();
  });

  it("rejects non-ABC code blocks", () => {
    const pre = createPre(`<code class="language-ts">const key = "C";</code>`);

    expect(detectGenericAbc(pre)).toBeNull();
  });
});
