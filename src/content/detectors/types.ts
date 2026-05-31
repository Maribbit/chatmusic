export type DetectionMethod = "tag" | "content";

export type DetectionProvider =
  | "generic"
  | "deepseek"
  | "gemini"
  | (string & {});

export interface DetectionResult {
  element: Element;
  abcText: string;
  method: DetectionMethod;
  provider: DetectionProvider;
}

export interface AbcDetector {
  provider: DetectionProvider;
  scan(root: Element | Document): DetectionResult[];
  detect?(element: Element): DetectionResult | null;
}
