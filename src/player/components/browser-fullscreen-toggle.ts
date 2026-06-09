import { LitElement, html, svg, type TemplateResult } from "lit";

export const BROWSER_FULLSCREEN_TOGGLE_EVENT =
  "chatmusic-browser-fullscreen-toggle";

const BROWSER_FULLSCREEN_TOGGLE_TAG_NAME =
  "chatmusic-browser-fullscreen-toggle";

export class ChatMusicBrowserFullscreenToggleElement extends LitElement {
  static properties = {
    isBrowserFullscreen: { state: true },
  };

  isBrowserFullscreen = false;

  /** The host element that receives the data attribute. */
  private hostElement: HTMLElement | null = null;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.isBrowserFullscreen) {
      this.exitBrowserFullscreen();
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("keydown", this.onKeyDown);
  }

  disconnectedCallback(): void {
    document.removeEventListener("keydown", this.onKeyDown);
    super.disconnectedCallback();
  }

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  setHostElement(host: HTMLElement): void {
    this.hostElement = host;
    this.isBrowserFullscreen =
      host.dataset.chatmusicBrowserFullscreen === "true";
  }

  protected render(): TemplateResult {
    const label = this.isBrowserFullscreen
      ? "Exit browser fullscreen"
      : "Enter browser fullscreen";

    return html`
      <button
        class="chatmusic-browser-fullscreen-button"
        type="button"
        title=${label}
        aria-label=${label}
        aria-pressed=${String(this.isBrowserFullscreen)}
        @click=${this.toggleBrowserFullscreen}
      >
        ${this.isBrowserFullscreen
          ? renderMinimizeIcon()
          : renderMaximizeIcon()}
      </button>
    `;
  }

  private toggleBrowserFullscreen = (): void => {
    if (this.isBrowserFullscreen) {
      this.exitBrowserFullscreen();
    } else {
      this.enterBrowserFullscreen();
    }
  };

  private enterBrowserFullscreen(): void {
    if (!this.hostElement) return;
    this.isBrowserFullscreen = true;
    this.hostElement.dataset.chatmusicBrowserFullscreen = "true";
    this.dispatchEvent(
      new CustomEvent(BROWSER_FULLSCREEN_TOGGLE_EVENT, {
        detail: { isBrowserFullscreen: true },
      }),
    );
  }

  private exitBrowserFullscreen(): void {
    if (!this.hostElement) return;
    this.isBrowserFullscreen = false;
    delete this.hostElement.dataset.chatmusicBrowserFullscreen;
    this.dispatchEvent(
      new CustomEvent(BROWSER_FULLSCREEN_TOGGLE_EVENT, {
        detail: { isBrowserFullscreen: false },
      }),
    );
  }
}

/**
 * Icon: expand / maximize — two arrows pointing outward to corners.
 * Shown when NOT in browser-fullscreen (invites user to expand).
 */
function renderMaximizeIcon(): TemplateResult {
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
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  `;
}

/**
 * Icon: minimize — two arrows pointing inward to center.
 * Shown when IN browser-fullscreen (invites user to restore).
 */
function renderMinimizeIcon(): TemplateResult {
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
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="10" x2="3" y1="14" y2="21" />
      <line x1="14" x2="21" y1="10" y2="3" />
    </svg>
  `;
}

if (!customElements.get(BROWSER_FULLSCREEN_TOGGLE_TAG_NAME)) {
  customElements.define(
    BROWSER_FULLSCREEN_TOGGLE_TAG_NAME,
    ChatMusicBrowserFullscreenToggleElement,
  );
}
