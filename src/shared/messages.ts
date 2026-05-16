export interface OpenStudioMessage {
  type: "OPEN_STUDIO";
  abcText: string;
}

export function createOpenStudioMessage(abcText: string): OpenStudioMessage {
  return {
    type: "OPEN_STUDIO",
    abcText,
  };
}

export function isOpenStudioMessage(
  message: unknown
): message is OpenStudioMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "OPEN_STUDIO" &&
    "abcText" in message &&
    typeof message.abcText === "string"
  );
}