import type { ThemeMode } from "../shared/settings";
import { resolveTheme } from "./theme";

export interface RenderViewElements {
  container: HTMLElement;
  scoreElement: HTMLElement;
  keyboardElement: HTMLElement;
  keyboardToggleButton: HTMLButtonElement;
  audioElement: HTMLElement;
  tempoMenuElement: HTMLElement;
  tempoInputElement: HTMLInputElement;
  tempoBpmElement: HTMLElement;
  exportButton: HTMLButtonElement;
  midiExportButton: HTMLButtonElement;
  studioButton: HTMLButtonElement;
  codeToggleButton: HTMLButtonElement;
  cleanup: () => void;
}

export function createRenderView(
  preElement: Element,
  themeMode: ThemeMode,
  shadowStyles: string
): RenderViewElements {
  const host = document.createElement("div");
  host.className = "chatmusic-host";
  applyRenderViewTheme(host, preElement, themeMode);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = shadowStyles;

  const container = document.createElement("div");
  container.className = "chatmusic-container";
  container.innerHTML = renderContainerMarkup();

  const fullscreenButton = container.querySelector(
    ".chatmusic-fullscreen-button"
  ) as HTMLButtonElement;
  const cleanup = setupFullscreenButton(host, fullscreenButton);

  shadowRoot.append(style, container);
  preElement.parentNode?.insertBefore(host, preElement.nextSibling);

  return {
    container: host,
    scoreElement: container.querySelector(".chatmusic-score") as HTMLElement,
    keyboardElement: container.querySelector(
      ".chatmusic-keyboard"
    ) as HTMLElement,
    keyboardToggleButton: container.querySelector(
      ".chatmusic-keyboard-toggle-button"
    ) as HTMLButtonElement,
    audioElement: container.querySelector(".chatmusic-audio") as HTMLElement,
    tempoMenuElement: container.querySelector(
      ".chatmusic-tempo-menu"
    ) as HTMLElement,
    tempoInputElement: container.querySelector(
      ".chatmusic-tempo-input"
    ) as HTMLInputElement,
    tempoBpmElement: container.querySelector(
      ".chatmusic-tempo-bpm-value"
    ) as HTMLElement,
    exportButton: container.querySelector(
      ".chatmusic-export-button"
    ) as HTMLButtonElement,
    midiExportButton: container.querySelector(
      ".chatmusic-midi-export-button"
    ) as HTMLButtonElement,
    studioButton: container.querySelector(
      ".chatmusic-studio-button"
    ) as HTMLButtonElement,
    codeToggleButton: container.querySelector(
      ".chatmusic-code-toggle-button"
    ) as HTMLButtonElement,
    cleanup,
  };
}

export function applyRenderViewTheme(
  host: HTMLElement,
  preElement: Element,
  themeMode: ThemeMode
): void {
  const resolvedTheme = resolveTheme(preElement, themeMode);

  host.dataset.chatmusicTheme = resolvedTheme;
  host.dataset.chatmusicThemeMode = themeMode;
  host.style.colorScheme = resolvedTheme;
}

function renderContainerMarkup(): string {
  return `
    <div class="chatmusic-header">
      <span class="chatmusic-label">ChatMusic</span>
      <div class="chatmusic-header-actions">
        <details class="chatmusic-tempo-menu" hidden>
          <summary class="chatmusic-tempo-button" title="Tempo" aria-label="Tempo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 21L9.6 4.2A2 2 0 0 1 11.5 2h1A2 2 0 0 1 14.4 4.2L17 21" />
              <path d="M5 21h14" />
              <path d="M9 13v-1 M15 13v-1" />
              <path d="M12 21V8" />
              <circle cx="12" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </summary>
          <div class="chatmusic-tempo-panel">
            <div class="chatmusic-tempo-readout" aria-live="polite">
              <span class="chatmusic-tempo-bpm-value">--</span>
              <span class="chatmusic-tempo-unit">BPM</span>
            </div>
            <label class="chatmusic-tempo-field">
              <input class="chatmusic-tempo-input" type="number" min="1" max="300" value="100" aria-label="Playback speed">
              <span>%</span>
            </label>
          </div>
        </details>
        <button class="chatmusic-export-button" type="button" title="Download score image" aria-label="Download score image">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-1.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </button>
        <button class="chatmusic-midi-export-button" type="button" title="Download MIDI" aria-label="Download MIDI">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </button>
        <button class="chatmusic-studio-button" type="button" title="Open in Studio" aria-label="Open in Studio">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>
          </svg>
        </button>
        <button class="chatmusic-fullscreen-button" type="button" title="Enter fullscreen" aria-label="Enter fullscreen" aria-pressed="false">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        </button>
        <button class="chatmusic-keyboard-toggle-button" type="button" title="Hide keyboard" aria-label="Hide keyboard" aria-pressed="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
            <path d="M8 6v8 M12 6v8 M16 6v8"/>
            <path d="M6 14h12"/>
          </svg>
        </button>
        <button class="chatmusic-code-toggle-button" type="button" title="Hide source code" aria-label="Hide source code" aria-pressed="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="chatmusic-score"></div>
    <div class="chatmusic-keyboard"></div>
    <div class="chatmusic-audio"></div>
  `;
}

function setupFullscreenButton(
  host: HTMLElement,
  button: HTMLButtonElement
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