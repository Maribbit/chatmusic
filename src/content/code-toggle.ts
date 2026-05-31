import { LitElement, html, svg, type TemplateResult } from "lit";

export const CODE_TOGGLE_EVENT = "chatmusic-code-toggle";

const CODE_TOGGLE_TAG_NAME = "chatmusic-code-toggle";

export class ChatMusicCodeToggleElement extends LitElement {
  static properties = {
    isCollapsed: { state: true },
  };

  isCollapsed = false;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  setCollapsed(isCollapsed: boolean): void {
    this.isCollapsed = isCollapsed;
  }

  protected render(): TemplateResult {
    const label = this.isCollapsed ? "Show source code" : "Hide source code";

    return html`
      <button
        class="chatmusic-code-toggle-button"
        type="button"
        title=${label}
        aria-label=${label}
        aria-pressed=${String(!this.isCollapsed)}
        @click=${this.toggleCode}
      >
        ${renderCodeIcon()}
      </button>
    `;
  }

  private toggleCode = (): void => {
    this.dispatchEvent(new CustomEvent(CODE_TOGGLE_EVENT));
  };
}

function renderCodeIcon(): TemplateResult {
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
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </svg>
  `;
}

if (!customElements.get(CODE_TOGGLE_TAG_NAME)) {
  customElements.define(CODE_TOGGLE_TAG_NAME, ChatMusicCodeToggleElement);
}