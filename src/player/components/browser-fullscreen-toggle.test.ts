import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatMusicBrowserFullscreenToggleElement } from "./browser-fullscreen-toggle";
import "./browser-fullscreen-toggle";

afterEach(() => {
  vi.restoreAllMocks();
  // Clean up any data attribute left on host elements
  document
    .querySelectorAll("[data-chatmusic-browser-fullscreen]")
    .forEach((el) => {
      if (el instanceof HTMLElement) {
        delete el.dataset.chatmusicBrowserFullscreen;
      }
    });
});

describe("browser fullscreen toggle", () => {
  it("starts with isBrowserFullscreen false", async () => {
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(element);
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
    expect(
      element
        .querySelector(".chatmusic-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Enter browser fullscreen");
  });

  it("enters browser fullscreen on click and sets data attribute", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    element
      .querySelector(".chatmusic-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(true);
    expect(host.dataset.chatmusicBrowserFullscreen).toBe("true");
    expect(
      element
        .querySelector(".chatmusic-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Exit browser fullscreen");
  });

  it("exits browser fullscreen on second click and removes data attribute", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    // Enter
    element
      .querySelector(".chatmusic-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(host.dataset.chatmusicBrowserFullscreen).toBe("true");

    // Exit
    element
      .querySelector(".chatmusic-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
    expect(host.dataset.chatmusicBrowserFullscreen).toBeUndefined();
    expect(
      element
        .querySelector(".chatmusic-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Enter browser fullscreen");
  });

  it("exits browser fullscreen on Escape keydown", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    // Enter
    element
      .querySelector(".chatmusic-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(element.isBrowserFullscreen).toBe(true);

    // Press Escape
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
    expect(host.dataset.chatmusicBrowserFullscreen).toBeUndefined();
  });

  it("does not exit on Escape when not in browser fullscreen", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    // Press Escape while not fullscreen
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(false);
  });

  it("reads initial state from host data attribute", async () => {
    const host = document.createElement("div");
    host.dataset.chatmusicBrowserFullscreen = "true";
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    expect(element.isBrowserFullscreen).toBe(true);
    expect(
      element
        .querySelector(".chatmusic-browser-fullscreen-button")
        ?.getAttribute("aria-label"),
    ).toBe("Exit browser fullscreen");
  });

  it("dispatches a custom event on toggle", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    const eventSpy = vi.fn();
    element.addEventListener("chatmusic-browser-fullscreen-toggle", eventSpy);

    // Enter
    element
      .querySelector(".chatmusic-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { isBrowserFullscreen: true },
      }),
    );

    // Exit
    element
      .querySelector(".chatmusic-browser-fullscreen-button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;

    expect(eventSpy).toHaveBeenCalledTimes(2);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { isBrowserFullscreen: false },
      }),
    );
  });

  it("toggles aria-pressed attribute", async () => {
    const host = document.createElement("div");
    const element = document.createElement(
      "chatmusic-browser-fullscreen-toggle",
    ) as ChatMusicBrowserFullscreenToggleElement;
    document.body.append(host, element);
    element.setHostElement(host);
    await element.updateComplete;

    const button = element.querySelector(
      ".chatmusic-browser-fullscreen-button",
    );

    expect(button?.getAttribute("aria-pressed")).toBe("false");

    // Enter
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(button?.getAttribute("aria-pressed")).toBe("true");

    // Exit
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(button?.getAttribute("aria-pressed")).toBe("false");
  });
});
