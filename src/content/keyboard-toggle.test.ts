import { describe, expect, it, vi } from "vitest";
import {
  ChatMusicKeyboardToggleElement,
  KEYBOARD_TOGGLE_EVENT,
} from "./keyboard-toggle";

describe("keyboard toggle", () => {
  it("updates its accessible state from visibility", async () => {
    const element = document.createElement(
      "chatmusic-keyboard-toggle",
    ) as ChatMusicKeyboardToggleElement;
    document.body.append(element);
    await element.updateComplete;

    let button = element.querySelector(".chatmusic-keyboard-toggle-button");
    expect(button?.getAttribute("aria-label")).toBe("Hide keyboard");
    expect(button?.getAttribute("aria-pressed")).toBe("true");

    element.setVisible(false);
    await element.updateComplete;

    button = element.querySelector(".chatmusic-keyboard-toggle-button");
    expect(button?.getAttribute("aria-label")).toBe("Show keyboard");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
  });

  it("emits toggle requests from the button", async () => {
    const element = document.createElement(
      "chatmusic-keyboard-toggle",
    ) as ChatMusicKeyboardToggleElement;
    const onToggle = vi.fn();
    document.body.append(element);
    element.addEventListener(KEYBOARD_TOGGLE_EVENT, onToggle);
    await element.updateComplete;

    element
      .querySelector(".chatmusic-keyboard-toggle-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});