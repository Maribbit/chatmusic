const DEFAULT_TITLE = "Imported MusicXML";
const ABC_UNIT_DIVISOR = 4;

interface MeterState {
  beats: number;
  beatType: number;
}

interface ConversionState {
  divisions: number;
  key: string;
  meter: MeterState;
}

interface MusicXmlEvent {
  pitches: string[];
  duration: number;
  divisions: number;
  isRest: boolean;
}

interface VoiceState {
  id: string;
  label: string;
  measures: string[];
}

interface MeasureVoiceState {
  cursor: number;
  events: MusicXmlEvent[];
}

export class MusicXmlConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MusicXmlConversionError";
  }
}

export function convertMusicXmlToAbc(musicXmlText: string): string {
  const musicXmlDocument = new DOMParser().parseFromString(
    musicXmlText,
    "application/xml"
  );
  assertValidMusicXmlDocument(musicXmlDocument);

  const score = musicXmlDocument.documentElement;
  if (score.localName !== "score-partwise") {
    throw new MusicXmlConversionError(
      "Only MusicXML score-partwise documents are supported."
    );
  }

  const parts = getChildren(score, "part");
  if (parts.length === 0) {
    throw new MusicXmlConversionError("No MusicXML parts were found.");
  }

  const initialState = getInitialState(parts);
  const partNames = getPartNames(score);
  const convertedParts = parts.flatMap((part, index) =>
    convertPart(part, partNames, index, initialState)
  );

  if (convertedParts.length === 0) {
    throw new MusicXmlConversionError("No playable MusicXML notes were found.");
  }

  return [
    "X: 1",
    `T: ${getScoreTitle(score)}`,
    `M: ${initialState.meter.beats}/${initialState.meter.beatType}`,
    "L: 1/16",
    `K: ${initialState.key}`,
    ...convertedParts.map((voice) => `V:${voice.id} name="${voice.label}"`),
    "",
    ...convertedParts.map((voice) => `[V:${voice.id}] ${finishVoiceLine(voice)}`),
  ].join("\n");
}

function assertValidMusicXmlDocument(musicXmlDocument: Document): void {
  if (getDescendants(musicXmlDocument.documentElement, "parsererror").length > 0) {
    throw new MusicXmlConversionError("The selected file is not valid XML.");
  }
}

function getInitialState(parts: Element[]): ConversionState {
  for (const part of parts) {
    for (const measure of getChildren(part, "measure")) {
      const attributes = getChild(measure, "attributes");
      if (attributes) return applyAttributes(createDefaultState(), attributes);
    }
  }

  return createDefaultState();
}

function createDefaultState(): ConversionState {
  return {
    divisions: 1,
    key: "C",
    meter: { beats: 4, beatType: 4 },
  };
}

function convertPart(
  part: Element,
  partNames: Map<string, string>,
  partIndex: number,
  initialState: ConversionState
): VoiceState[] {
  const partId = part.getAttribute("id") || `P${partIndex + 1}`;
  const partName = partNames.get(partId) ?? `Part ${partIndex + 1}`;
  const voices = new Map<string, VoiceState>();
  const state = cloneState(initialState);

  for (const measure of getChildren(part, "measure")) {
    const measureVoices = new Map<string, MeasureVoiceState>();
    let cursor = 0;

    for (const child of Array.from(measure.children)) {
      if (child.localName === "attributes") {
        applyAttributes(state, child);
      } else if (child.localName === "note") {
        const duration = appendNoteEvent(child, measureVoices, state, cursor);
        if (duration !== null && !getChild(child, "chord")) cursor += duration;
      } else if (child.localName === "backup") {
        cursor = Math.max(0, cursor - getTimelineDuration(child));
      } else if (child.localName === "forward") {
        cursor += getTimelineDuration(child);
      }
    }

    for (const [voiceId, measureVoice] of measureVoices) {
      const voice = getOrCreateVoice(voices, partId, partName, voiceId);
      const measureText = measureVoice.events.map(formatEvent).join(" ");
      if (measureText) voice.measures.push(`${measureText} |`);
    }
  }

  const hasMultipleVoices = voices.size > 1;
  return Array.from(voices.values()).map((voice) => ({
    ...voice,
    label: hasMultipleVoices
      ? `${voice.label} ${voice.id.split("_").slice(-1)[0]}`
      : voice.label,
  }));
}

function appendNoteEvent(
  note: Element,
  measureVoices: Map<string, MeasureVoiceState>,
  state: ConversionState,
  cursor: number
): number | null {
  if (getChild(note, "grace")) return null;

  const duration = getNoteDuration(note, state);
  if (duration <= 0) return null;

  const voiceId = getChildText(note, "voice") || "1";
  const measureVoice = getOrCreateMeasureVoice(measureVoices, voiceId);
  const events = measureVoice.events;
  const event = createEvent(note, duration, state.divisions);
  const previousEvent = events[events.length - 1];

  if (
    getChild(note, "chord") &&
    previousEvent &&
    !previousEvent.isRest &&
    !event.isRest
  ) {
    previousEvent.pitches.push(...event.pitches);
    return duration;
  }

  if (cursor > measureVoice.cursor) {
    events.push(createRestEvent(cursor - measureVoice.cursor, state.divisions));
  }

  events.push(event);
  measureVoice.cursor = Math.max(measureVoice.cursor, cursor + duration);
  return duration;
}

function createRestEvent(duration: number, divisions: number): MusicXmlEvent {
  return { pitches: [], duration, divisions, isRest: true };
}

function createEvent(
  note: Element,
  duration: number,
  divisions: number
): MusicXmlEvent {
  if (getChild(note, "rest")) {
    return {
      pitches: [],
      duration,
      divisions,
      isRest: true,
    };
  }

  const pitch = getChild(note, "pitch");
  if (!pitch) {
    return {
      pitches: [],
      duration,
      divisions,
      isRest: true,
    };
  }

  return {
    pitches: [toAbcPitch(pitch)],
    duration,
    divisions,
    isRest: false,
  };
}

function formatEvent(event: MusicXmlEvent): string {
  const duration = formatDuration(event.duration, event.divisions);
  if (event.isRest) return `z${duration}`;

  if (event.pitches.length === 1) return `${event.pitches[0]}${duration}`;

  return `[${event.pitches.join("")}]${duration}`;
}

function formatDuration(duration: number, divisions: number): string {
  const numerator = duration * ABC_UNIT_DIVISOR;
  const denominator = divisions;
  const divisor = greatestCommonDivisor(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;

  if (reducedNumerator === reducedDenominator) return "";
  if (reducedDenominator === 1) return String(reducedNumerator);
  if (reducedNumerator === 1) {
    return reducedDenominator === 2 ? "/" : `/${reducedDenominator}`;
  }

  return `${reducedNumerator}/${reducedDenominator}`;
}

function getNoteDuration(note: Element, state: ConversionState): number {
  const duration = readPositiveNumber(getChildText(note, "duration"));
  if (duration !== null) return duration;

  if (getChild(note, "rest")?.getAttribute("measure") === "yes") {
    return getMeasureDuration(state);
  }

  return getTypeDuration(getChildText(note, "type"), state.divisions);
}

function getTypeDuration(type: string | null, divisions: number): number {
  switch (type) {
    case "whole":
      return divisions * 4;
    case "half":
      return divisions * 2;
    case "quarter":
      return divisions;
    case "eighth":
      return divisions / 2;
    case "16th":
      return divisions / 4;
    case "32nd":
      return divisions / 8;
    default:
      return divisions;
  }
}

function getMeasureDuration(state: ConversionState): number {
  return state.divisions * state.meter.beats * (4 / state.meter.beatType);
}

function getTimelineDuration(element: Element): number {
  return readPositiveNumber(getChildText(element, "duration")) ?? 0;
}

function toAbcPitch(pitch: Element): string {
  const step = getChildText(pitch, "step") ?? "C";
  const octave = readPositiveNumber(getChildText(pitch, "octave")) ?? 4;
  const alter = Number(getChildText(pitch, "alter") ?? "0");
  const accidental = getAccidental(alter);
  const normalizedStep = step.toUpperCase();

  if (octave >= 5) {
    return `${accidental}${normalizedStep.toLowerCase()}${"'".repeat(octave - 5)}`;
  }

  return `${accidental}${normalizedStep}${",".repeat(4 - octave)}`;
}

function getAccidental(alter: number): string {
  if (alter <= -2) return "__";
  if (alter === -1) return "_";
  if (alter === 1) return "^";
  if (alter >= 2) return "^^";
  return "";
}

function applyAttributes(
  state: ConversionState,
  attributes: Element
): ConversionState {
  const divisions = readPositiveNumber(getChildText(attributes, "divisions"));
  if (divisions !== null) state.divisions = divisions;

  const key = getChild(attributes, "key");
  if (key) state.key = parseKey(key);

  const time = getChild(attributes, "time");
  if (time) state.meter = parseMeter(time);

  return state;
}

function parseKey(key: Element): string {
  const fifths = Number(getChildText(key, "fifths") ?? "0");
  const mode = getChildText(key, "mode")?.toLowerCase();
  const majorKeys = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
  const minorKeys = ["Abm", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm", "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m"];
  const index = fifths + 7;

  if (index < 0 || index >= majorKeys.length) return "C";
  return mode === "minor" ? minorKeys[index] : majorKeys[index];
}

function parseMeter(time: Element): MeterState {
  return {
    beats: readPositiveNumber(getChildText(time, "beats")) ?? 4,
    beatType: readPositiveNumber(getChildText(time, "beat-type")) ?? 4,
  };
}

function getScoreTitle(score: Element): string {
  return (
    getDescendantText(score, "work-title") ??
    getDescendantText(score, "movement-title") ??
    getDescendantText(score, "credit-words") ??
    DEFAULT_TITLE
  );
}

function getPartNames(score: Element): Map<string, string> {
  const partNames = new Map<string, string>();
  const partList = getChild(score, "part-list");
  if (!partList) return partNames;

  for (const scorePart of getChildren(partList, "score-part")) {
    const id = scorePart.getAttribute("id");
    const name = getChildText(scorePart, "part-name");
    if (id && name) partNames.set(id, name);
  }

  return partNames;
}

function getOrCreateVoice(
  voices: Map<string, VoiceState>,
  partId: string,
  partName: string,
  voiceId: string
): VoiceState {
  const id = `${sanitizeVoiceId(partId)}_${sanitizeVoiceToken(voiceId)}`;
  const existing = voices.get(id);
  if (existing) return existing;

  const voice = { id, label: escapeAbcText(partName), measures: [] };
  voices.set(id, voice);
  return voice;
}

function getOrCreateMeasureVoice(
  measureVoices: Map<string, MeasureVoiceState>,
  voiceId: string
): MeasureVoiceState {
  const existing = measureVoices.get(voiceId);
  if (existing) return existing;

  const measureVoice = { cursor: 0, events: [] };
  measureVoices.set(voiceId, measureVoice);
  return measureVoice;
}

function finishVoiceLine(voice: VoiceState): string {
  return voice.measures.join(" ").replace(/\|\s*$/, "|]");
}

function sanitizeVoiceId(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z]/.test(sanitized) ? sanitized : `V${sanitized}`;
}

function sanitizeVoiceToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, "_") || "1";
}

function escapeAbcText(value: string): string {
  return value.replace(/"/g, "'");
}

function cloneState(state: ConversionState): ConversionState {
  return {
    divisions: state.divisions,
    key: state.key,
    meter: { ...state.meter },
  };
}

function readPositiveNumber(value: string | null): number | null {
  if (!value) return null;

  const number = Number(value.trim());
  return Number.isFinite(number) && number > 0 ? number : null;
}

function greatestCommonDivisor(first: number, second: number): number {
  let a = Math.abs(first);
  let b = Math.abs(second);

  while (b > 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a || 1;
}

function getChild(element: Element, localName: string): Element | null {
  return getChildren(element, localName)[0] ?? null;
}

function getChildren(element: Element, localName: string): Element[] {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function getChildText(element: Element, localName: string): string | null {
  return getChild(element, localName)?.textContent?.trim() || null;
}

function getDescendantText(element: Element, localName: string): string | null {
  return getDescendants(element, localName)[0]?.textContent?.trim() || null;
}

function getDescendants(element: Element, localName: string): Element[] {
  return Array.from(element.getElementsByTagName("*")).filter(
    (descendant) => descendant.localName === localName
  );
}