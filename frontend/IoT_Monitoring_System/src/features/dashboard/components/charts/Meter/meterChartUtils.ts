export const DEFAULT_MIN = 0;
export const DEFAULT_MAX = 100;
export const DEFAULT_TICKS = 5;

export const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const resolveCssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const applyAlpha = (color: string, alpha: number) => {
  const safeAlpha = Math.min(Math.max(alpha, 0), 1);
  const hex = color.trim();
  if (hex.startsWith("#")) {
    const raw = hex.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      if ([r, g, b].every((v) => Number.isFinite(v))) {
        return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
      }
    }
    if (raw.length === 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      if ([r, g, b].every((v) => Number.isFinite(v))) {
        return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
      }
    }
    return color;
  }
  const rgbMatch = color
    .replace(/\s+/g, "")
    .match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    if ([r, g, b].every((v) => Number.isFinite(v))) {
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
  }
  return color;
};

export const buildMeterTheme = () => ({
  defaultAccent: resolveCssVar("--color-primary-300", "#93c5fd"),
  text: resolveCssVar("--text-white", "#e2e8f0"),
  grid: resolveCssVar("--color-neutral-100", "#9ca3af"),
});
