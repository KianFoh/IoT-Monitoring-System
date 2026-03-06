export const FALLBACK_COLOR = "#9ca3af";
export const FALLBACK_TEXT = "#e2e8f0";
export const FALLBACK_GRID = "rgba(255,255,255,0.25)";
export const FALLBACK_TOOLTIP_BG = "#0f172a";
export const FALLBACK_TOOLTIP_BORDER = "rgba(255,255,255,0.12)";

export const wrapLabel = (label: string, maxLineLength = 10, maxLines = 3) => {
  const trimmed = label.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLineLength) return trimmed;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const pushLine = () => {
    if (!current) return;
    lines.push(current);
    current = "";
  };
  if (words.length === 1) {
    for (let i = 0; i < trimmed.length; i += maxLineLength) {
      lines.push(trimmed.slice(i, i + maxLineLength));
    }
  } else {
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLineLength && current) {
        pushLine();
        current = word;
      } else {
        current = next;
      }
    });
    pushLine();
  }
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }
  const trimmedLines = lines.slice(0, maxLines);
  const last = trimmedLines[maxLines - 1];
  trimmedLines[maxLines - 1] = `${last.replace(/\.*$/, "")}...`;
  return trimmedLines.join("\n");
};

export const buildBarChartTheme = () => {
  if (typeof window === "undefined") {
    return {
      primary: FALLBACK_COLOR,
      fallback: FALLBACK_COLOR,
      text: FALLBACK_TEXT,
      grid: FALLBACK_GRID,
      tooltipBg: FALLBACK_TOOLTIP_BG,
      tooltipBorder: FALLBACK_TOOLTIP_BORDER,
    };
  }
  const rootStyles = getComputedStyle(document.documentElement);
  const readVar = (name: string, fallback: string) => {
    const value = rootStyles.getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    primary: readVar("--color-primary-200", FALLBACK_COLOR),
    fallback: readVar("--color-neutral-400", FALLBACK_COLOR),
    text: readVar("--color-primary-100", FALLBACK_TEXT),
    grid: readVar("--color-overlay-white-medium", FALLBACK_GRID),
    tooltipBg: readVar("--color-dark-900", FALLBACK_TOOLTIP_BG),
    tooltipBorder: readVar("--color-dark-600", FALLBACK_TOOLTIP_BORDER),
  };
};

export const createNumberFormatter = () => new Intl.NumberFormat();
