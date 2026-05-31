import { LitElement, html, svg, type TemplateResult } from "lit";

const FULLSCREEN_TOGGLE_TAG_NAME = "chatmusic-fullscreen-toggle";

export class ChatMusicFullscreenToggleElement extends LitElement {
  static properties = {
    canFullscreen: { state: true },
    isFullscreen: { state: true },
  };

  canFullscreen = false;
  isFullscreen = false;

  private fullscreenTarget: HTMLElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("fullscreenchange", this.updateFullscreenState);
    this.updateAvailability();
  }

  disconnectedCallback(): void {
    document.removeEventListener("fullscreenchange", this.updateFullscreenState);
    super.disconnectedCallback();
  }

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  setFullscreenTarget(target: HTMLElement): void {
    this.fullscreenTarget = target;
    this.updateAvailability();
  }

  protected render(): TemplateResult {
    const label = this.isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

    return html`
      <button
        class="chatmusic-fullscreen-button"
        type="button"
        title=${label}
        aria-label=${label}
        aria-pressed=${String(this.isFullscreen)}
        @click=${this.toggleFullscreen}
      >
        ${renderFullscreenIcon()}
      </button>
    `;
  }

  private updateAvailability(): void {
    this.canFullscreen = Boolean(
      document.fullscreenEnabled && this.fullscreenTarget?.requestFullscreen,
    );
    this.hidden = !this.canFullscreen;
    this.updateFullscreenState();
  }

  private updateFullscreenState = (): void => {
    this.isFullscreen = Boolean(
      this.fullscreenTarget && document.fullscreenElement === this.fullscreenTarget,
    );
  };

  private toggleFullscreen = async (): Promise<void> => {
    if (!this.fullscreenTarget || !this.canFullscreen) return;

    try {
      if (document.fullscreenElement === this.fullscreenTarget) {
        await document.exitFullscreen();
      } else {
        await this.fullscreenTarget.requestFullscreen();
      }
    } catch (err) {
      console.warn("[ChatMusic] Fullscreen toggle failed:", err);
    }
  };
}

function renderFullscreenIcon(): TemplateResult {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  `;
}

if (!customElements.get(FULLSCREEN_TOGGLE_TAG_NAME)) {
  customElements.define(
    FULLSCREEN_TOGGLE_TAG_NAME,
    ChatMusicFullscreenToggleElement,
  );
}