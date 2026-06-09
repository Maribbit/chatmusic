import { html, render, svg, type TemplateResult } from "lit";
import type { ThemeMode } from "../../shared/settings";
import { CODE_TOGGLE_EVENT } from "../components/code-toggle";
import type { ChatMusicBrowserFullscreenToggleElement } from "../components/browser-fullscreen-toggle";
import "../components/browser-fullscreen-toggle";
import type { ChatMusicFullscreenToggleElement } from "../components/fullscreen-toggle";
import "../components/fullscreen-toggle";
import "../components/keyboard-toggle";
import { QUALITY_COPY_EVENT } from "../components/quality-panel";
import { resolveTheme } from "./theme";

export interface RenderViewElements {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboardElement: HTMLElement;
  keyboardToggleElement: HTMLElement;
  audioElement: HTMLElement;
  qualityElement: HTMLElement;
  tempoElement: HTMLElement;
  codeToggleElement: HTMLElement;
  browserFullscreenToggleElement: HTMLElement;
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

  const fullscreenToggle = container.querySelector(
    "chatmusic-fullscreen-toggle",
  ) as ChatMusicFullscreenToggleElement;
  fullscreenToggle.setFullscreenTarget(host);

  const browserFullscreenToggle = container.querySelector(
    "chatmusic-browser-fullscreen-toggle",
  ) as ChatMusicBrowserFullscreenToggleElement;
  browserFullscreenToggle.setHostElement(host);

  const cleanupActions = setupRenderViewActions(container, handlers);
  const cleanup = () => cleanupActions();

  shadowRoot.append(style, container);
  preElement.parentNode?.insertBefore(host, preElement.nextSibling);

  return {
    container: host,
    scoreElement: container.querySelector(".chatmusic-score") as HTMLElement,
    keyboardElement: container.querySelector(
      ".chatmusic-keyboard",
    ) as HTMLElement,
    keyboardToggleElement: container.querySelector(
      "chatmusic-keyboard-toggle",
    ) as HTMLElement,
    audioElement: container.querySelector(".chatmusic-audio") as HTMLElement,
    qualityElement: container.querySelector("chatmusic-quality") as HTMLElement,
    tempoElement: container.querySelector("chatmusic-tempo") as HTMLElement,
    codeToggleElement: container.querySelector(
      "chatmusic-code-toggle",
    ) as HTMLElement,
    browserFullscreenToggleElement: browserFullscreenToggle,
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
        <chatmusic-fullscreen-toggle></chatmusic-fullscreen-toggle>
        <chatmusic-browser-fullscreen-toggle></chatmusic-browser-fullscreen-toggle>
        <chatmusic-keyboard-toggle></chatmusic-keyboard-toggle>
        <chatmusic-code-toggle></chatmusic-code-toggle>
      </div>
    </div>
    <chatmusic-quality
      class="chatmusic-quality-panel"
      aria-live="polite"
      hidden
    ></chatmusic-quality>
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

function setupRenderViewActions(
  container: HTMLElement,
  handlers: RenderViewHandlers,
): () => void {
  const cleanupCallbacks = [
    setupElementAction(
      container.querySelector("chatmusic-quality"),
      QUALITY_COPY_EVENT,
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
    setupElementAction(
      container.querySelector("chatmusic-code-toggle"),
      CODE_TOGGLE_EVENT,
      handlers.onToggleCode,
    ),
  ];

  return () => {
    for (const cleanup of cleanupCallbacks) cleanup();
  };
}

function setupElementAction(
  element: Element | null,
  eventName: string,
  handler: (() => void) | undefined,
): () => void {
  if (!element || !handler) return () => {};

  element.addEventListener(eventName, handler);
  return () => element.removeEventListener(eventName, handler);
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
