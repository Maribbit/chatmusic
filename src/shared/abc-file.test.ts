import { describe, expect, it } from "vitest";
import {
  getAbcSourceDownloadFilename,
  importAbcFile,
  isAbcFile,
} from "./abc-file";

describe("ABC file helpers", () => {
  it("accepts ABC and plain text files", () => {
    expect(isAbcFile(new File([""], "score.abc"))).toBe(true);
    expect(isAbcFile(new File([""], "score.txt"))).toBe(true);
    expect(isAbcFile(new File([""], "score.musicxml"))).toBe(false);
  });

  it("imports ABC source text", async () => {
    await expect(importAbcFile(new File(["X:1\nK:C\nC|"], "score.abc"))).resolves.toBe(
      "X:1\nK:C\nC|"
    );
  });

  it("rejects unsupported file extensions", async () => {
    await expect(importAbcFile(new File([""], "score.mid"))).rejects.toThrow(
      "Please choose an ABC or plain text file"
    );
  });

  it("uses the ABC title for source export filenames", () => {
    expect(getAbcSourceDownloadFilename("X:1\nT:Morning Tune\nK:C\nC|"))
      .toBe("Morning Tune.abc");
  });
});