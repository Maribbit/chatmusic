import { LitElement, html, svg, type TemplateResult } from "lit";

export const KEYBOARD_TOGGLE_EVENT = "chatmusic-keyboard-toggle";

const KEYBOARD_TOGGLE_TAG_NAME = "chatmusic-keyboard-toggle";

export class ChatMusicKeyboardToggleElement extends LitElement {
  static properties = {
    isVisible: { state: true },
  };

  isVisible = true;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  setVisible(isVisible: boolean): void {
    this.isVisible = isVisible;
  }

  protected render(): TemplateResult {
    const label = this.isVisible ? "Hide keyboard" : "Show keyboard";

    return html`
      <button
        class="chatmusic-keyboard-toggle-button"
        type="button"
        title=${label}
        aria-label=${label}
        aria-pressed=${String(this.isVisible)}
        @click=${this.toggleKeyboard}
      >
        ${renderKeyboardIcon()}
      </button>
    `;
  }

  private toggleKeyboard = (): void => {
    this.dispatchEvent(new CustomEvent(KEYBOARD_TOGGLE_EVENT));
  };
}

function renderKeyboardIcon(): TemplateResult {
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
      <path
        d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
      />
      <path d="M8 6v8 M12 6v8 M16 6v8" />
      <path d="M6 14h12" />
    </svg>
  `;
}

if (!customElements.get(KEYBOARD_TOGGLE_TAG_NAME)) {
  customElements.define(KEYBOARD_TOGGLE_TAG_NAME, ChatMusicKeyboardToggleElement);
}