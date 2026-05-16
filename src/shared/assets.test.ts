import { describe, expect, it, vi } from "vitest";
import { getAssetUrl, joinAssetBaseUrl, normalizeAssetPath } from "./assets";

describe("asset URL helpers", () => {
  it("normalizes leading slashes before resolving assets", () => {
    expect(normalizeAssetPath("/icons/icon48.png")).toBe("icons/icon48.png");
    expect(normalizeAssetPath("///soundfonts/FluidR3_GM/")).toBe(
      "soundfonts/FluidR3_GM/"
    );
  });

  it("uses the extension runtime when it is available", () => {
    const getURL = vi.fn((path: string) => `chrome-extension://id/${path}`);

    expect(
      getAssetUrl("/soundfonts/FluidR3_GM/", {
        runtime: { getURL },
        baseUrl: "/ignored/",
      })
    ).toBe("chrome-extension://id/soundfonts/FluidR3_GM/");
    expect(getURL).toHaveBeenCalledWith("soundfonts/FluidR3_GM/");
  });

  it("falls back to the provided web base URL", () => {
    expect(
      getAssetUrl("icons/icon48.png", {
        runtime: null,
        baseUrl: "/chatmusic/",
      })
    ).toBe("/chatmusic/icons/icon48.png");
  });

  it("joins common Vite base URL shapes", () => {
    expect(joinAssetBaseUrl("/", "icons/icon48.png")).toBe(
      "/icons/icon48.png"
    );
    expect(joinAssetBaseUrl("/chatmusic", "icons/icon48.png")).toBe(
      "/chatmusic/icons/icon48.png"
    );
    expect(joinAssetBaseUrl("./", "icons/icon48.png")).toBe(
      "./icons/icon48.png"
    );
  });
});