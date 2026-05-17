import { describe, expect, it } from "vitest";
import { importMusicXmlFile, isMusicXmlFile } from "./musicxml-file";

describe("MusicXML file import", () => {
  it("accepts uncompressed MusicXML file extensions", () => {
    expect(isMusicXmlFile(new File([""], "score.musicxml"))).toBe(true);
    expect(isMusicXmlFile(new File([""], "score.xml"))).toBe(true);
    expect(isMusicXmlFile(new File([""], "score.mid"))).toBe(false);
  });

  it("rejects compressed MXL files with an actionable message", async () => {
    await expect(importMusicXmlFile(new File([""], "score.mxl"))).rejects.toThrow(
      "Compressed .mxl files are not supported yet"
    );
  });
});