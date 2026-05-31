import { genericDetector } from "./generic";
import { deepSeekDetector } from "./providers/deepseek";
import { geminiDetector } from "./providers/gemini";
import type { AbcDetector, DetectionResult } from "./types";

export type {
  AbcDetector,
  DetectionMethod,
  DetectionProvider,
  DetectionResult,
} from "./types";

const DETECTORS: AbcDetector[] = [
  geminiDetector,
  deepSeekDetector,
  genericDetector,
];

export function detectAbc(element: Element): DetectionResult | null {
  return genericDetector.detect?.(element) ?? null;
}

export function scanForAbc(root: Element | Document): DetectionResult[] {
  const results: DetectionResult[] = [];

  for (const detector of DETECTORS) {
    for (const candidate of detector.scan(root)) {
      addUniqueDetection(results, candidate);
    }
  }

  return results;
}

function addUniqueDetection(
  results: DetectionResult[],
  candidate: DetectionResult,
): void {
  if (
    results.some(
      (result) =>
        result.element === candidate.element ||
        result.element.contains(candidate.element),
    )
  ) {
    return;
  }

  for (let index = results.length - 1; index >= 0; index--) {
    if (candidate.element.contains(results[index].element)) {
      results.splice(index, 1);
    }
  }

  results.push(candidate);
}
