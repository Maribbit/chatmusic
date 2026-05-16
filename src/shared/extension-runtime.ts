export interface ExtensionRuntime {
  getURL?: (path: string) => string;
  sendMessage?: (message: unknown) => void | Promise<unknown>;
}

export interface ExtensionStorageArea {
  get: (
    keys: string[],
    callback: (items: Record<string, unknown>) => void
  ) => void;
  set: (items: Record<string, unknown>) => void | Promise<void>;
}

interface ExtensionChromeGlobal {
  runtime?: ExtensionRuntime;
  storage?: {
    sync?: ExtensionStorageArea;
  };
}

function getChromeGlobal(): ExtensionChromeGlobal | null {
  return (globalThis as { chrome?: ExtensionChromeGlobal }).chrome ?? null;
}

export function getExtensionRuntime(): ExtensionRuntime | null {
  const runtime = getChromeGlobal()?.runtime;
  return runtime ? runtime : null;
}

export function getExtensionSyncStorage(): ExtensionStorageArea | null {
  return getChromeGlobal()?.storage?.sync ?? null;
}