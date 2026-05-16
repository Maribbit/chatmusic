import {
  getExtensionRuntime,
  type ExtensionRuntime,
} from "./extension-runtime";

interface AssetUrlOptions {
  baseUrl?: string;
  runtime?: ExtensionRuntime | null;
}

export function getAssetUrl(
  path: string,
  options: AssetUrlOptions = {}
): string {
  const normalizedPath = normalizeAssetPath(path);
  const runtime =
    options.runtime === undefined ? getExtensionRuntime() : options.runtime;

  if (runtime?.getURL) return runtime.getURL(normalizedPath);

  return joinAssetBaseUrl(
    options.baseUrl ?? import.meta.env.BASE_URL,
    normalizedPath
  );
}

export function normalizeAssetPath(path: string): string {
  return path.replace(/^\/+/, "");
}

export function joinAssetBaseUrl(baseUrl: string, assetPath: string): string {
  const normalizedPath = normalizeAssetPath(assetPath);
  const base = baseUrl || "/";

  if (base === "/") return `/${normalizedPath}`;
  return `${base.endsWith("/") ? base : `${base}/`}${normalizedPath}`;
}