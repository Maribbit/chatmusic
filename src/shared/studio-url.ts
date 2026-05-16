import { getAssetUrl } from "./assets";
import type { ExtensionRuntime } from "./extension-runtime";

export const STUDIO_PAGE_PATH = "src/studio/index.html";
export const STUDIO_ABC_HASH_PREFIX = "abc=";

interface StudioUrlOptions {
  baseUrl?: string;
  runtime?: ExtensionRuntime | null;
}

export function createStudioUrl(
  abcText: string,
  options: StudioUrlOptions = {}
): string {
  const studioUrl = new URL(
    getAssetUrl(STUDIO_PAGE_PATH, options),
    globalThis.location?.href
  );
  studioUrl.hash = encodeStudioAbcHash(abcText);
  return studioUrl.toString();
}

export function encodeStudioAbcHash(abcText: string): string {
  return `${STUDIO_ABC_HASH_PREFIX}${encodeURIComponent(abcText)}`;
}

export function decodeStudioAbcHash(hash: string): string | null {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalizedHash.startsWith(STUDIO_ABC_HASH_PREFIX)) return null;

  return decodeURIComponent(
    normalizedHash.slice(STUDIO_ABC_HASH_PREFIX.length)
  );
}