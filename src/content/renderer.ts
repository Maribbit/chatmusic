/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjs from "abcjs";
import abcjsAudioStyles from "abcjs/abcjs-audio.css?inline";
import chatmusicStyles from "./styles.css?inline";
import {
  DEFAULT_CODE_BLOCK_VISIBILITY,
  DEFAULT_THEME_MODE,
  type CodeBlockVisibility,
  type ThemeMode,
} from "../shared/settings";
import { resolveTheme } from "./theme";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  audioElement: HTMLElement;
  tempoMenuElement: HTMLElement;
  tempoInputElement: HTMLInputElement;
  codeToggleButton: HTMLButtonElement;
  preElement: Element;
  preElementOriginalDisplay: string | null;
  isCodeCollapsed: boolean;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  synthControl: abcjs.SynthObjectController | null;
  cleanup: () => void;
}

interface RenderElements {
  container: HTMLElement;
  scoreElement: HTMLElement;
  audioElement: HTMLElement;
  tempoMenuElement: HTMLElement;
  tempoInputElement: HTMLInputElement;
  codeToggleButton: HTMLButtonElement;
  cleanup: () => void;
}

const instances = new Map<Element, RenderInstance>();
const shadowStyles = `${abcjsAudioStyles}\n${chatmusicStyles}`;

/**
 * Create the ChatMusic container with score area and audio area.
 * Uses abcjs SynthController's built-in UI for playback (has progress, warp, etc.)
 */
function createContainer(
  preElement: Element,
  themeMode: ThemeMode
): RenderElements {
  const host = document.createElement("div");
  host.className = "chatmusic-host";
  applyHostTheme(host, preElement, themeMode);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = shadowStyles;

  const container = document.createElement("div");
  container.className = "chatmusic-container";

  container.innerHTML = `
    <div class="chatmusic-header">
      <span class="chatmusic-label">ChatMusic</span>
      <div class="chatmusic-header-actions">
        <details class="chatmusic-tempo-menu" hidden>
          <summary class="chatmusic-tempo-button" title="Tempo" aria-label="Tempo">♩</summary>
          <div class="chatmusic-tempo-panel">
            <label class="chatmusic-tempo-field">
              <input class="chatmusic-tempo-input" type="number" min="1" max="300" value="100" aria-label="Playback speed">
              <span>%</span>
            </label>
          </div>
        </details>
        <button class="chatmusic-fullscreen-button" type="button" title="Enter fullscreen" aria-label="Enter fullscreen" aria-pressed="false">⛶</button>
        <button class="chatmusic-code-toggle-button" type="button" title="Hide source code" aria-label="Hide source code" aria-pressed="true">&lt;/&gt;</button>
      </div>
    </div>
    <div class="chatmusic-score"></div>
    <div class="chatmusic-audio"></div>
  `;

  const fullscreenButton = container.querySelector(
    ".chatmusic-fullscreen-button"
  ) as HTMLButtonElement;
  const cleanup = setupFullscreenButton(host, fullscreenButton);

  shadowRoot.append(style, container);

  // Insert after the <pre> element
  preElement.parentNode?.insertBefore(host, preElement.nextSibling);

  return {
    container: host,
    scoreElement: container.querySelector(".chatmusic-score") as HTMLElement,
    audioElement: container.querySelector(".chatmusic-audio") as HTMLElement,
    tempoMenuElement: container.querySelector(
      ".chatmusic-tempo-menu"
    ) as HTMLElement,
    tempoInputElement: container.querySelector(
      ".chatmusic-tempo-input"
    ) as HTMLInputElement,
    codeToggleButton: container.querySelector(
      ".chatmusic-code-toggle-button"
    ) as HTMLButtonElement,
    cleanup,
  };
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

function applyHostTheme(
  host: HTMLElement,
  preElement: Element,
  themeMode: ThemeMode
): void {
  const resolvedTheme = resolveTheme(preElement, themeMode);

  host.dataset.chatmusicTheme = resolvedTheme;
  host.dataset.chatmusicThemeMode = themeMode;
  host.style.colorScheme = resolvedTheme;
}

/**
 * Initialize the abcjs SynthController for playback.
 * This creates the full built-in audio UI (play/pause, progress, warp, restart).
 */
async function initSynth(instance: RenderInstance): Promise<void> {
  if (!instance.visualObj || instance.visualObj.length === 0) return;

  const audioEl = instance.audioElement;
  instance.tempoMenuElement.hidden = true;
  instance.tempoInputElement.onchange = null;

  if (!abcjs.synth.supportsAudio()) {
    audioEl.innerHTML = '<p class="chatmusic-no-audio">Audio playback not supported in this browser.</p>';
    return;
  }

  try {
    const synthControl = new abcjs.synth.SynthController();
    synthControl.load(audioEl, null, {
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    });

    await synthControl.setTune(instance.visualObj[0], false);
    setupTempoControl(instance);
    instance.synthControl = synthControl;
  } catch (err) {
    console.error("[ChatMusic] Synth init error:", err);
    audioEl.innerHTML = '<p class="chatmusic-no-audio">Failed to initialize audio playback.</p>';
  }
}

function setupTempoControl(instance: RenderInstance): void {
  const nativeTempoInput = instance.audioElement.querySelector(
    ".abcjs-midi-tempo"
  ) as HTMLInputElement | null;

  if (!nativeTempoInput) return;

  instance.tempoInputElement.value = nativeTempoInput.value;
  instance.tempoInputElement.min = nativeTempoInput.min;
  instance.tempoInputElement.max = nativeTempoInput.max;
  instance.tempoInputElement.onchange = () => {
    nativeTempoInput.value = instance.tempoInputElement.value;
    nativeTempoInput.dispatchEvent(new Event("change", { bubbles: true }));
  };
  instance.tempoMenuElement.hidden = false;
}

/**
 * Render ABC notation for a given <pre> element.
 * Creates the container, renders SVG, and sets up playback.
 */
export function renderAbc(
  preElement: Element,
  abcText: string,
  themeMode: ThemeMode = DEFAULT_THEME_MODE,
  codeBlockVisibility: CodeBlockVisibility = DEFAULT_CODE_BLOCK_VISIBILITY
): RenderInstance {
  // If already rendered, update instead of creating new
  const existing = instances.get(preElement);
  if (existing) {
    applyTheme(existing, themeMode);
    if (existing.abcText === abcText) return existing;
    return updateRender(existing, abcText, themeMode);
  }

  const elements = createContainer(preElement, themeMode);

  // Render sheet music SVG
  const visualObj = abcjs.renderAbc(elements.scoreElement, abcText, {
    responsive: "resize",
    add_classes: true,
  });

  const instance: RenderInstance = {
    container: elements.container,
    scoreElement: elements.scoreElement,
    audioElement: elements.audioElement,
    tempoMenuElement: elements.tempoMenuElement,
    tempoInputElement: elements.tempoInputElement,
    codeToggleButton: elements.codeToggleButton,
    preElement,
    preElementOriginalDisplay: null,
    isCodeCollapsed: false,
    abcText,
    themeMode,
    visualObj,
    synthControl: null,
    cleanup: elements.cleanup,
  };

  setupCodeToggleButton(instance);
  applyCodeBlockVisibility(instance, codeBlockVisibility);
  instances.set(preElement, instance);

  // Initialize synth (async, non-blocking)
  initSynth(instance);

  return instance;
}

function setupCodeToggleButton(instance: RenderInstance): void {
  const toggleCode = () => {
    setCodeCollapsed(instance, !instance.isCodeCollapsed);
  };
  const previousCleanup = instance.cleanup;

  instance.codeToggleButton.addEventListener("click", toggleCode);
  instance.cleanup = () => {
    instance.codeToggleButton.removeEventListener("click", toggleCode);
    previousCleanup();
  };
}

function applyCodeBlockVisibility(
  instance: RenderInstance,
  codeBlockVisibility: CodeBlockVisibility
): void {
  setCodeCollapsed(instance, codeBlockVisibility === "collapsed");
}

function setCodeCollapsed(
  instance: RenderInstance,
  isCollapsed: boolean
): void {
  if (!(instance.preElement instanceof HTMLElement)) return;

  if (instance.preElementOriginalDisplay === null) {
    instance.preElementOriginalDisplay = instance.preElement.style.display;
  }

  instance.isCodeCollapsed = isCollapsed;
  instance.preElement.style.display = isCollapsed
    ? "none"
    : instance.preElementOriginalDisplay;
  updateCodeToggleButton(instance);
}

function updateCodeToggleButton(instance: RenderInstance): void {
  const label = instance.isCodeCollapsed
    ? "Show source code"
    : "Hide source code";

  instance.codeToggleButton.title = label;
  instance.codeToggleButton.setAttribute("aria-label", label);
  instance.codeToggleButton.setAttribute(
    "aria-pressed",
    String(!instance.isCodeCollapsed)
  );
}

export function updateCodeBlockVisibility(
  codeBlockVisibility: CodeBlockVisibility
): void {
  for (const instance of instances.values()) {
    applyCodeBlockVisibility(instance, codeBlockVisibility);
  }
}

/**
 * Update an existing render with new ABC text.
 */
function updateRender(
  instance: RenderInstance,
  abcText: string,
  themeMode: ThemeMode
): RenderInstance {
  applyTheme(instance, themeMode);

  // Re-render SVG
  const visualObj = abcjs.renderAbc(instance.scoreElement, abcText, {
    responsive: "resize",
    add_classes: true,
  });

  instance.abcText = abcText;
  instance.visualObj = visualObj;

  // Re-initialize synth with new tune
  if (instance.synthControl) {
    instance.synthControl.pause();
    instance.synthControl = null;
  }
  initSynth(instance);

  return instance;
}

function applyTheme(instance: RenderInstance, themeMode: ThemeMode): void {
  instance.themeMode = themeMode;
  applyHostTheme(instance.container, instance.preElement, themeMode);
}

export function updateRenderThemes(themeMode: ThemeMode): void {
  for (const instance of instances.values()) {
    applyTheme(instance, themeMode);
  }
}

/**
 * Remove a render instance and its DOM elements.
 */
export function removeRender(preElement: Element): void {
  const instance = instances.get(preElement);
  if (instance) {
    if (instance.synthControl) {
      instance.synthControl.pause();
    }
    setCodeCollapsed(instance, false);
    instance.cleanup();
    instance.container.remove();
    instances.delete(preElement);
  }
}

/**
 * Check if a <pre> element already has a ChatMusic render.
 */
export function hasRender(preElement: Element): boolean {
  return instances.has(preElement);
}
