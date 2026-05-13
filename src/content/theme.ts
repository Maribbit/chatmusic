import {
  DEFAULT_THEME_MODE,
  type ResolvedTheme,
  type ThemeMode,
} from "../shared/settings";

interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const DARK_BRIGHTNESS_THRESHOLD = 140;
const MIN_VISIBLE_ALPHA = 0.01;

export function resolveTheme(
  element: Element,
  themeMode: ThemeMode = DEFAULT_THEME_MODE
): ResolvedTheme {
  if (themeMode === "light" || themeMode === "dark") return themeMode;
  return detectElementTheme(element);
}

export function detectElementTheme(element: Element): ResolvedTheme {
  const preferredTheme = getPreferredTheme();
  const effectiveBackground = getEffectiveBackgroundColor(
    element,
    preferredTheme
  );

  if (!effectiveBackground) return preferredTheme;

  return getPerceivedBrightness(effectiveBackground) < DARK_BRIGHTNESS_THRESHOLD
    ? "dark"
    : "light";
}

function getEffectiveBackgroundColor(
  element: Element,
  fallbackTheme: ResolvedTheme
): RgbaColor | null {
  const colors: RgbaColor[] = [];
  const ownerWindow = element.ownerDocument.defaultView;
  let current: Element | null = element;

  while (current) {
    const backgroundColor = ownerWindow
      ?.getComputedStyle(current)
      .backgroundColor;
    const parsedColor = backgroundColor
      ? parseCssRgbColor(backgroundColor)
      : null;

    if (parsedColor && parsedColor.alpha > MIN_VISIBLE_ALPHA) {
      colors.push(parsedColor);
    }

    current = current.parentElement;
  }

  if (colors.length === 0) return null;

  let compositeColor = getFallbackBackgroundColor(fallbackTheme);
  for (const color of colors.reverse()) {
    compositeColor = compositeOver(color, compositeColor);
  }

  return compositeColor;
}

function parseCssRgbColor(value: string): RgbaColor | null {
  const color = value.trim().toLowerCase();
  if (color === "transparent") return null;

  const match = /^rgba?\((.*)\)$/.exec(color);
  if (!match) return null;

  const parts = match[1]
    .replace(/\s+\/\s+/, " ")
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/);

  if (parts.length < 3) return null;

  const red = parseColorChannel(parts[0]);
  const green = parseColorChannel(parts[1]);
  const blue = parseColorChannel(parts[2]);
  const alpha = parts[3] ? parseAlphaChannel(parts[3]) : 1;

  if (red === null || green === null || blue === null || alpha === null) {
    return null;
  }

  return { red, green, blue, alpha };
}

function parseColorChannel(value: string): number | null {
  const channel = value.endsWith("%")
    ? (Number(value.slice(0, -1)) / 100) * 255
    : Number(value);

  return Number.isFinite(channel) ? clamp(channel, 0, 255) : null;
}

function parseAlphaChannel(value: string): number | null {
  const alpha = value.endsWith("%")
    ? Number(value.slice(0, -1)) / 100
    : Number(value);

  return Number.isFinite(alpha) ? clamp(alpha, 0, 1) : null;
}

function compositeOver(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };

  return {
    red:
      (foreground.red * foreground.alpha +
        background.red * background.alpha * (1 - foreground.alpha)) /
      alpha,
    green:
      (foreground.green * foreground.alpha +
        background.green * background.alpha * (1 - foreground.alpha)) /
      alpha,
    blue:
      (foreground.blue * foreground.alpha +
        background.blue * background.alpha * (1 - foreground.alpha)) /
      alpha,
    alpha,
  };
}

function getPerceivedBrightness(color: RgbaColor): number {
  return color.red * 0.299 + color.green * 0.587 + color.blue * 0.114;
}

function getPreferredTheme(): ResolvedTheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getFallbackBackgroundColor(theme: ResolvedTheme): RgbaColor {
  return theme === "dark"
    ? { red: 0, green: 0, blue: 0, alpha: 1 }
    : { red: 255, green: 255, blue: 255, alpha: 1 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}