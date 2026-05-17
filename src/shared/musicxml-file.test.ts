import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { importMusicXmlFile, isMusicXmlFile } from "./musicxml-file";

const MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;

describe("MusicXML file import", () => {
  it("accepts MusicXML file extensions", () => {
    expect(isMusicXmlFile(new File([""], "score.musicxml"))).toBe(true);
    expect(isMusicXmlFile(new File([""], "score.xml"))).toBe(true);
    expect(isMusicXmlFile(new File([""], "score.mxl"))).toBe(true);
    expect(isMusicXmlFile(new File([""], "score.mid"))).toBe(false);
  });

  it("imports compressed MXL files using META-INF/container.xml", async () => {
    const archive = zipSync({
      "META-INF/container.xml": strToU8(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="score.musicxml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles>
</container>`),
      "score.musicxml": strToU8(MUSICXML),
    });

    await expect(importMusicXmlFile(new File([archive], "score.mxl"))).resolves.toContain(
      "[V:P1_1] C4 |]"
    );
  });

  it("imports compressed MXL files with a score file fallback", async () => {
    const archive = zipSync({ "score.xml": strToU8(MUSICXML) });

    await expect(importMusicXmlFile(new File([archive], "score.mxl"))).resolves.toContain(
      "[V:P1_1] C4 |]"
    );
  });
});