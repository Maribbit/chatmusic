import { describe, expect, it, vi } from "vitest";
import {
  createStudioUrl,
  decodeStudioAbcHash,
  encodeStudioAbcHash,
} from "./studio-url";

describe("Studio URL helpers", () => {
  it("round-trips ABC text through the Studio hash", () => {
    const abcText = "X: 1\nT: Hash Test\nK: C\nC D E F |]";
    const hash = encodeStudioAbcHash(abcText);

    expect(hash).toContain("abc=");
    expect(decodeStudioAbcHash(hash)).toBe(abcText);
    expect(decodeStudioAbcHash(`#${hash}`)).toBe(abcText);
  });

  it("returns null for non-Studio hashes", () => {
    expect(decodeStudioAbcHash("#section-1")).toBeNull();
  });

  it("creates extension Studio URLs with encoded source", () => {
    const getURL = vi.fn(
      (path: string) => `chrome-extension://id/${path}`
    );
    const url = createStudioUrl("X: 1\nK: C\nC |]", {
      runtime: { getURL },
    });

    expect(url).toContain("chrome-extension://id/src/studio/index.html");
    expect(url).toContain("#abc=X%3A%201");
    expect(getURL).toHaveBeenCalledWith("src/studio/index.html");
  });
});