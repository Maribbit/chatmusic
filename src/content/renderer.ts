/**
 * ABC notation renderer using abcjs.
 * Creates sheet music SVG and playback controls below detected code blocks.
 */
import abcjs from "abcjs";
import "abcjs/abcjs-audio.css";

export interface RenderInstance {
  container: HTMLElement;
  preElement: Element;
  abcText: string;
  visualObj: abcjs.TuneObject[] | null;
  synthControl: abcjs.SynthObjectController | null;
}

const instances = new Map<Element, RenderInstance>();

/**
 * Create the ChatMusic container with score area and audio area.
 * Uses abcjs SynthController's built-in UI for playback (has progress, warp, etc.)
 */
function createContainer(preElement: Element): HTMLElement {
  const container = document.createElement("div");
  container.className = "chatmusic-container";

  container.innerHTML = `
    <div class="chatmusic-header">
      <span class="chatmusic-label">🎵 ChatMusic</span>
    </div>
    <div class="chatmusic-score"></div>
    <div class="chatmusic-audio"></div>
  `;

  // Insert after the <pre> element
  preElement.parentNode?.insertBefore(container, preElement.nextSibling);

  return container;
}

/**
 * Initialize the abcjs SynthController for playback.
 * This creates the full built-in audio UI (play/pause, progress, warp, restart).
 */
async function initSynth(instance: RenderInstance): Promise<void> {
  if (!instance.visualObj || instance.visualObj.length === 0) return;

  const audioEl = instance.container.querySelector(".chatmusic-audio") as HTMLElement;

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
export function renderAbc(preElement: Element, abcText: string): RenderInstance {
  // If already rendered, update instead of creating new
  const existing = instances.get(preElement);
  if (existing) {
    if (existing.abcText === abcText) return existing;
    return updateRender(existing, abcText);
  }

  const container = createContainer(preElement);
  const scoreEl = container.querySelector(".chatmusic-score") as HTMLElement;

  // Render sheet music SVG
  const visualObj = abcjs.renderAbc(scoreEl, abcText, {
    responsive: "resize",
    add_classes: true,
  });

  const instance: RenderInstance = {
    container,
    preElement,
    abcText,
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
function updateRender(instance: RenderInstance, abcText: string): RenderInstance {
  const scoreEl = instance.container.querySelector(".chatmusic-score") as HTMLElement;

  // Re-render SVG
  const visualObj = abcjs.renderAbc(scoreEl, abcText, {
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
