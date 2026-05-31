import { LitElement, html, type TemplateResult } from "lit";
import type { AbcDiagnostic } from "../../shared/abc-quality/diagnostics";

export const QUALITY_COPY_EVENT = "chatmusic-quality-copy";

const QUALITY_TAG_NAME = "chatmusic-quality";

export class ChatMusicQualityElement extends LitElement {
  static properties = {
    diagnostics: { state: true },
  };

  diagnostics: AbcDiagnostic[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this.hidden = this.diagnostics.length === 0;
  }

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  setDiagnostics(diagnostics: AbcDiagnostic[]): void {
    this.diagnostics = diagnostics;
    this.hidden = diagnostics.length === 0;
  }

  protected render(): TemplateResult | null {
    if (this.diagnostics.length === 0) return null;

    return html`
      <div class="chatmusic-quality-header">
        <strong class="chatmusic-quality-summary">
          ${this.diagnostics.length} ABC parser
          issue${this.diagnostics.length === 1 ? "" : "s"} found.
        </strong>
        <button
          class="chatmusic-quality-copy-button"
          type="button"
          @click=${this.copyFeedback}
        >
          Copy feedback
        </button>
      </div>
      <ul class="chatmusic-quality-list">
        ${this.diagnostics.map((diagnostic) =>
          this.renderDiagnostic(diagnostic),
        )}
      </ul>
    `;
  }

  private renderDiagnostic(diagnostic: AbcDiagnostic): TemplateResult {
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
  }

  private copyFeedback = (): void => {
    this.dispatchEvent(new CustomEvent(QUALITY_COPY_EVENT));
  };
}

function formatDiagnosticLocation(diagnostic: AbcDiagnostic): string | null {
  if (diagnostic.line === undefined) return null;
  if (diagnostic.column === undefined) return `Line ${diagnostic.line}`;
  return `Line ${diagnostic.line}, column ${diagnostic.column}`;
}

if (!customElements.get(QUALITY_TAG_NAME)) {
  customElements.define(QUALITY_TAG_NAME, ChatMusicQualityElement);
}
