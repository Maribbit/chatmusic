import { describe, expect, it, vi } from "vitest";
import { ChatMusicCodeToggleElement, CODE_TOGGLE_EVENT } from "./code-toggle";

describe("code toggle", () => {
  it("updates its accessible state from the collapsed flag", async () => {
    const element = document.createElement(
      "chatmusic-code-toggle",
    ) as ChatMusicCodeToggleElement;
    document.body.append(element);
    await element.updateComplete;

    let button = element.querySelector(".chatmusic-code-toggle-button");
    expect(button?.getAttribute("aria-label")).toBe("Hide source code");
    expect(button?.getAttribute("aria-pressed")).toBe("true");

    element.setCollapsed(true);
    await element.updateComplete;

    button = element.querySelector(".chatmusic-code-toggle-button");
    expect(button?.getAttribute("aria-label")).toBe("Show source code");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
  });

  it("emits toggle requests from the button", async () => {
    const element = document.createElement(
      "chatmusic-code-toggle",
    ) as ChatMusicCodeToggleElement;
    const onToggle = vi.fn();
    document.body.append(element);
    element.addEventListener(CODE_TOGGLE_EVENT, onToggle);
    await element.updateComplete;

    element
      .querySelector(".chatmusic-code-toggle-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});