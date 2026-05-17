import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import { convertMusicXmlToAbc, MusicXmlConversionError } from "./musicxml-to-abc";

const SIMPLE_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Morning Sketch</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>half</type></note>
    </measure>
  </part>
</score-partwise>`;

describe("MusicXML to ABC conversion", () => {
  it("converts a simple partwise score to ABC", () => {
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain("T: Morning Sketch");
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain("M: 4/4");
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain("K: C");
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain("[V:P1_1] C4 D4 z8 |]");
  });

  it("creates ABC that abcjs can parse", () => {
    expect(abcjs.parseOnly(convertMusicXmlToAbc(SIMPLE_MUSICXML))).toHaveLength(1);
  });

  it("converts altered pitches and chords", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>2</divisions><key><fifths>1</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("M: 3/4");
    expect(abc).toContain("K: G");
    expect(abc).toContain("[^FA]4 |]");
  });

  it("respects backup and forward offsets for separate voices", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    <backup><duration>4</duration></backup>
    <forward><duration>2</duration></forward>
    <note><pitch><step>G</step><octave>3</octave></pitch><duration>2</duration><voice>2</voice></note>
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("[V:P1_1] C16 |]");
    expect(abc).toContain("[V:P1_2] z8 G,8 |]");
  });

  it("throws a typed error for unsupported MusicXML shapes", () => {
    expect(() => convertMusicXmlToAbc("<score-timewise />")).toThrow(
      MusicXmlConversionError
    );
  });
});