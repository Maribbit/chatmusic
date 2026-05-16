import { describe, expect, it } from "vitest";
import { createOpenStudioMessage, isOpenStudioMessage } from "./messages";

describe("extension messages", () => {
  it("creates and validates Open Studio messages", () => {
    const message = createOpenStudioMessage("X: 1\nK: C\nC |]");

    expect(isOpenStudioMessage(message)).toBe(true);
    expect(message).toEqual({
      type: "OPEN_STUDIO",
      abcText: "X: 1\nK: C\nC |]",
    });
  });

  it("rejects malformed Open Studio messages", () => {
    expect(isOpenStudioMessage(null)).toBe(false);
    expect(isOpenStudioMessage({ type: "OPEN_STUDIO" })).toBe(false);
    expect(isOpenStudioMessage({ type: "OPEN_STUDIO", abcText: 1 })).toBe(
      false
    );
    expect(isOpenStudioMessage({ type: "OTHER", abcText: "X: 1" })).toBe(
      false
    );
  });
});