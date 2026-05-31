import { html, render, svg, type TemplateResult } from "lit";
import type { AbcDiagnostic } from "../shared/abc-quality/diagnostics";
import type { ThemeMode } from "../shared/settings";
import { resolveTheme } from "./theme";

export interface RenderViewElements {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboardElement: HTMLElement;
  keyboardToggleButton: HTMLButtonElement;
  audioElement: HTMLElement;
  qualityPanelElement: HTMLElement;
  qualitySummaryElement: HTMLElement;
  qualityListElement: HTMLElement;
  tempoElement: HTMLElement;
  codeToggleButton: HTMLButtonElement;
  cleanup: () => void;
}

export interface RenderViewHandlers {
  onCopyQualityFeedback?: () => void;
  onExportScore?: () => void;
  onExportMidi?: () => void;
  onOpenStudio?: () => void;
  onToggleCode?: () => void;
}

export function createRenderView(
  preElement: Element,
  themeMode: ThemeMode,
  shadowStyles: string,
  handlers: RenderViewHandlers = {},
): RenderViewElements {
  const host = document.createElement("div");
  host.className = "chatmusic-host";
  applyRenderViewTheme(host, preElement, themeMode);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = shadowStyles;

  const container = document.createElement("div");
  container.className = "chatmusic-container";
  render(renderContainerTemplate(), container);

  const fullscreenButton = container.querySelector(
    ".chatmusic-fullscreen-button",
  ) as HTMLButtonElement;
  const cleanupFullscreenButton = setupFullscreenButton(host, fullscreenButton);
  const cleanupActions = setupRenderViewActions(container, handlers);
  const cleanup = () => {
    cleanupActions();
    cleanupFullscreenButton();
  };

  shadowRoot.append(style, container);
  preElement.parentNode?.insertBefore(host, preElement.nextSibling);

  return {
    container: host,
    scoreElement: container.querySelector(".chatmusic-score") as HTMLElement,
    keyboardElement: container.querySelector(
      ".chatmusic-keyboard",
    ) as HTMLElement,
    keyboardToggleButton: container.querySelector(
      ".chatmusic-keyboard-toggle-button",
    ) as HTMLButtonElement,
    audioElement: container.querySelector(".chatmusic-audio") as HTMLElement,
    qualityPanelElement: container.querySelector(
      ".chatmusic-quality-panel",
    ) as HTMLElement,
    qualitySummaryElement: container.querySelector(
      ".chatmusic-quality-summary",
    ) as HTMLElement,
    qualityListElement: container.querySelector(
      ".chatmusic-quality-list",
    ) as HTMLElement,
    tempoElement: container.querySelector("chatmusic-tempo") as HTMLElement,
    codeToggleButton: container.querySelector(
      ".chatmusic-code-toggle-button",
    ) as HTMLButtonElement,
    cleanup,
  };
}

export function applyRenderViewTheme(
  host: HTMLElement,
  preElement: Element,
  themeMode: ThemeMode,
): void {
  const resolvedTheme = resolveTheme(preElement, themeMode);

  host.dataset.chatmusicTheme = resolvedTheme;
  host.dataset.chatmusicThemeMode = themeMode;
  host.style.colorScheme = resolvedTheme;
}

export function renderQualityDiagnostics(
  listElement: HTMLElement,
  diagnostics: AbcDiagnostic[],
): void {
  render(
    html`${diagnostics.map((diagnostic) => {
      const location = formatDiagnosticLocation(diagnostic);

      return html`
        <li class="chatmusic-quality-item">
          <span class="chatmusic-quality-title">
            ${diagnostic.severity.toUpperCase()}: ${diagnostic.title}
          </span>
          <span>${diagnostic.message}</span>
          ${location
            ? html`<span class="chatmusic-quality-location">${location}</span>`
            : null}
        </li>
      `;
    })}`,
    listElement,
  );
}

export function clearQualityDiagnostics(listElement: HTMLElement): void {
  render(null, listElement);
}

function formatDiagnosticLocation(diagnostic: AbcDiagnostic): string | null {
  if (diagnostic.line === undefined) return null;
  if (diagnostic.column === undefined) return `Line ${diagnostic.line}`;
  return `Line ${diagnostic.line}, column ${diagnostic.column}`;
}

function renderContainerTemplate(): TemplateResult {
  return html`
    <div class="chatmusic-header">
      <span class="chatmusic-label">ChatMusic</span>
      <div class="chatmusic-header-actions">
        <chatmusic-tempo hidden></chatmusic-tempo>
        <button
          class="chatmusic-export-button"
          type="button"
          title="Download score image"
          aria-label="Download score image"
        >
          ${renderCameraIcon()}
        </button>
        <button
          class="chatmusic-midi-export-button"
          type="button"
          title="Download MIDI"
          aria-label="Download MIDI"
        >
          ${renderMusicIcon()}
        </button>
        <button
          class="chatmusic-studio-button"
          type="button"
          title="Open in Studio"
          aria-label="Open in Studio"
        >
          ${renderExternalLinkIcon()}
        </button>
        <button
          class="chatmusic-fullscreen-button"
          type="button"
          title="Enter fullscreen"
          aria-label="Enter fullscreen"
          aria-pressed="false"
        >
          ${renderFullscreenIcon()}
        </button>
        <button
          class="chatmusic-keyboard-toggle-button"
          type="button"
          title="Hide keyboard"
          aria-label="Hide keyboard"
          aria-pressed="true"
        >
          ${renderKeyboardIcon()}
        </button>
        <button
          class="chatmusic-code-toggle-button"
          type="button"
          title="Hide source code"
          aria-label="Hide source code"
          aria-pressed="true"
        >
          ${renderCodeIcon()}
        </button>
      </div>
    </div>
    <div class="chatmusic-quality-panel" aria-live="polite" hidden>
      <div class="chatmusic-quality-header">
        <strong class="chatmusic-quality-summary"></strong>
        <button class="chatmusic-quality-copy-button" type="button">
          Copy feedback
        </button>
      </div>
      <ul class="chatmusic-quality-list"></ul>
    </div>
    <div class="chatmusic-score"></div>
    <chatmusic-keyboard class="chatmusic-keyboard"></chatmusic-keyboard>
    <div class="chatmusic-audio"></div>
  `;
}

function renderIcon(paths: TemplateResult): TemplateResult {
  return svg`
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      ${paths}
    </svg>
  `;
}

function renderCameraIcon(): TemplateResult {
  return renderIcon(svg`
    <path
      d="M14.5 4h-5L8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-1.5-3z"
    />
    <circle cx="12" cy="13" r="3" />
  `);
}

function renderMusicIcon(): TemplateResult {
  return renderIcon(svg`
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  `);
}

function renderExternalLinkIcon(): TemplateResult {
  return renderIcon(svg`
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  `);
}

function renderFullscreenIcon(): TemplateResult {
  return renderIcon(svg`
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  `);
}

function renderKeyboardIcon(): TemplateResult {
  return renderIcon(svg`
    <path
      d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
    />
    <path d="M8 6v8 M12 6v8 M16 6v8" />
    <path d="M6 14h12" />
  `);
}

function renderCodeIcon(): TemplateResult {
  return renderIcon(svg`
    <path d="m18 16 4-4-4-4" />
    <path d="m6 8-4 4 4 4" />
    <path d="m14.5 4-5 16" />
  `);
}

function setupRenderViewActions(
  container: HTMLElement,
  handlers: RenderViewHandlers,
): () => void {
  const cleanupCallbacks = [
    setupButtonAction(
      container.querySelector(".chatmusic-quality-copy-button"),
      handlers.onCopyQualityFeedback,
    ),
    setupButtonAction(
      container.querySelector(".chatmusic-export-button"),
      handlers.onExportScore,
    ),
    setupButtonAction(
      container.querySelector(".chatmusic-midi-export-button"),
      handlers.onExportMidi,
    ),
    setupButtonAction(
      container.querySelector(".chatmusic-studio-button"),
      handlers.onOpenStudio,
      true,
    ),
    setupButtonAction(
      container.querySelector(".chatmusic-code-toggle-button"),
      handlers.onToggleCode,
    ),
  ];

  return () => {
    for (const cleanup of cleanupCallbacks) cleanup();
  };
}

function setupButtonAction(
  button: Element | null,
  handler: (() => void) | undefined,
  hideWhenMissing = false,
): () => void {
  if (!(button instanceof HTMLButtonElement)) return () => {};
  if (!handler) {
    if (hideWhenMissing) button.hidden = true;
    return () => {};
  }

  button.addEventListener("click", handler);
  return () => button.removeEventListener("click", handler);
}

function setupFullscreenButton(
  host: HTMLElement,
  button: HTMLButtonElement,
): () => void {
  if (!document.fullscreenEnabled || !host.requestFullscreen) {
    button.hidden = true;
    return () => {};
  }

  const updateButtonState = () => {
    const isFullscreen = document.fullscreenElement === host;
    const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(isFullscreen));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === host) {
        await document.exitFullscreen();
      } else {
        await host.requestFullscreen();
      }
    } catch (err) {
      console.warn("[ChatMusic] Fullscreen toggle failed:", err);
    }
  };

  button.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateButtonState);
  updateButtonState();

  return () => {
    button.removeEventListener("click", toggleFullscreen);
    document.removeEventListener("fullscreenchange", updateButtonState);
  };
}
