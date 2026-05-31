import abcjs from "abcjs";
import { describe, expect, it } from "vitest";
import {
  convertMusicXmlToAbc,
  MusicXmlConversionError,
} from "./musicxml-to-abc";

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
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain(
      "T: Morning Sketch",
    );
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain("M: 4/4");
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain("K: C");
    expect(convertMusicXmlToAbc(SIMPLE_MUSICXML)).toContain(
      "[V:P1_1] C4 D4 z8 |]",
    );
  });

  it("creates ABC that abcjs can parse", () => {
    expect(abcjs.parseOnly(convertMusicXmlToAbc(SIMPLE_MUSICXML))).toHaveLength(
      1,
    );
  });

  it("places voice definitions before the key so abcjs renders generated voices", () => {
    const abc = convertMusicXmlToAbc(SIMPLE_MUSICXML);
    const renderTarget = document.createElement("div");
    document.body.append(renderTarget);

    expect(abc.indexOf("V:P1_1")).toBeLessThan(abc.indexOf("K: C"));

    abcjs.renderAbc(renderTarget, abc, { add_classes: true });

    expect(renderTarget.querySelector("path")).not.toBeNull();
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

  it("formats non-binary MusicXML durations as ABC tuplets", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>6</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("(3:2:3 C D E |]");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).not.toContain("Duration not representable");
  });

  it("splits long tuplet runs into abcjs-friendly groups", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>6</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${Array.from({ length: 12 }, (_, index) => `<note><pitch><step>${["C", "D", "E"][index % 3]}</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>`).join("\n    ")}
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("(3:2:3 C D E (3:2:3 C D E");
    expect(abc).not.toContain("(3:2:12");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).toHaveLength(0);
  });

  it("moves large tuplet ratio factors into written durations", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>5</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${Array.from({ length: 5 }, (_, index) => `<note><pitch><step>${["C", "D", "E", "F", "G"][index]}</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice></note>`).join("\n    ")}
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("(5:6:5 C2 D2 E2 F2 G2 |]");
    expect(abc).not.toContain("(5:12:5");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).toHaveLength(0);
  });

  it("approximates tuplets that require abcjs-unsupported ratio widths", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>40</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${Array.from({ length: 10 }, (_, index) => `<note><pitch><step>${["C", "D", "E", "F", "G", "A", "B", "C", "D", "E"][index]}</step><octave>4</octave></pitch><duration>11</duration><voice>1</voice></note>`).join("\n    ")}
  </measure></part>
</score-partwise>`);

    expect(abc).not.toContain("(10:11");
    expect(abc).toContain("C D E F G A B C D E |]");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).toHaveLength(0);
  });

  it("does not approximate unsupported tiny ratios to abcjs-rejected 1/8 durations", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>40</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>1</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`);

    expect(abc).not.toContain("/8");
    expect(abc).toContain("z/4 |]");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).toHaveLength(0);
  });

  it("splits long non-power integer durations into abcjs-friendly fragments", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>10</duration><voice>1</voice></note>
    <note><rest/><duration>10</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("C8-C2 z8 z2 |]");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).toHaveLength(0);
  });

  it("splits compound binary fractions into tied abcjs-friendly fragments", () => {
    const abc = convertMusicXmlToAbc(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>8</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>13</duration><voice>1</voice></note>
    <note><rest/><duration>13</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`);

    expect(abc).toContain("C4-C2-C/ z4 z2 z/ |]");
    expect(
      abcjs.parseOnly(abc, {
        generate_warnings: true,
      } as abcjs.AbcVisualParams)[0]?.warnings ?? [],
    ).toHaveLength(0);
  });

  it("throws a typed error for unsupported MusicXML shapes", () => {
    expect(() => convertMusicXmlToAbc("<score-timewise />")).toThrow(
      MusicXmlConversionError,
    );
  });
});
