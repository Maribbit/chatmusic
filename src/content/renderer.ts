/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjs from "abcjs";
import abcjsAudioStyles from "abcjs/abcjs-audio.css?inline";
import chatmusicStyles from "./styles.css?inline";
import { DEFAULT_THEME_MODE, type ThemeMode } from "../shared/settings";
import { resolveTheme } from "./theme";

export interface RenderInstance {
  container: HTMLElement;
  scoreElement: HTMLElement;
  audioElement: HTMLElement;
  preElement: Element;
  abcText: string;
  themeMode: ThemeMode;
  visualObj: abcjs.TuneObject[] | null;
  synthControl: abcjs.SynthObjectController | null;
}

interface RenderElements {
  container: HTMLElement;
  scoreElement: HTMLElement;
  audioElement: HTMLElement;
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
      <span class="chatmusic-label">🎵 ChatMusic</span>
    </div>
    <div class="chatmusic-score"></div>
    <div class="chatmusic-audio"></div>
  `;

  shadowRoot.append(style, container);

  // Insert after the <pre> element
  preElement.parentNode?.insertBefore(host, preElement.nextSibling);

  return {
    container: host,
    scoreElement: container.querySelector(".chatmusic-score") as HTMLElement,
    audioElement: container.querySelector(".chatmusic-audio") as HTMLElement,
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
    instance.synthControl = synthControl;
  } catch (err) {
    console.error("[ChatMusic] Synth init error:", err);
    audioEl.innerHTML = '<p class="chatmusic-no-audio">Failed to initialize audio playback.</p>';
  }
}

/**
 * Render ABC notation for a given <pre> element.
 * Creates the container, renders SVG, and sets up playback.
 */
export function renderAbc(
  preElement: Element,
  abcText: string,
  themeMode: ThemeMode = DEFAULT_THEME_MODE
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
    preElement,
    abcText,
    themeMode,
    visualObj,
    synthControl: null,
  };

  instances.set(preElement, instance);

  // Initialize synth (async, non-blocking)
  initSynth(instance);

  return instance;
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
