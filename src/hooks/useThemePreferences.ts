import { useCallback, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export type CuratedThemeId =
  | 'lavender-sky'
  | 'mint-peach'
  | 'night-ocean'
  | 'rose-mist'
  | 'forest-haze'
  | 'sunset-cloud';

export interface CuratedThemeOption {
  id: CuratedThemeId;
  name: string;
}

export type ThemeColorKey = 'accent' | 'blob1' | 'blob2';

export interface ThemeColorOverrides {
  accent: string | null;
  blob1: string | null;
  blob2: string | null;
}

export interface ThemeColorPickerValues {
  accent: string;
  blob1: string;
  blob2: string;
}

export type ThemeOverrideErrors = Partial<Record<ThemeColorKey, string>>;

const STORAGE_MODE_KEY = 'focusflow_theme_mode_v1';
const STORAGE_THEME_KEY = 'focusflow_theme_id_v1';
const STORAGE_COLOR_OVERRIDES_KEY = 'focusflow_theme_color_overrides_v1';

const FALLBACK_MODE: ThemeMode = 'system';
const FALLBACK_THEME: CuratedThemeId = 'lavender-sky';
const EMPTY_OVERRIDES: ThemeColorOverrides = {
  accent: null,
  blob1: null,
  blob2: null,
};

const THEME_DEFAULT_COLORS: Record<CuratedThemeId, ThemeColorPickerValues> = {
  'lavender-sky': {
    accent: '#8b7dff',
    blob1: '#ccc0ff',
    blob2: '#e8ddff',
  },
  'mint-peach': {
    accent: '#5ed6b6',
    blob1: '#b4f5dc',
    blob2: '#ffdcc6',
  },
  'night-ocean': {
    accent: '#78a7ff',
    blob1: '#78a5ff',
    blob2: '#5f80dc',
  },
  'rose-mist': {
    accent: '#ef8db6',
    blob1: '#fac4d8',
    blob2: '#e8cbff',
  },
  'forest-haze': {
    accent: '#6fba84',
    blob1: '#aae1c6',
    blob2: '#cde8ba',
  },
  'sunset-cloud': {
    accent: '#f2a067',
    blob1: '#ffc4a4',
    blob2: '#ffdebc',
  },
};

export const CURATED_THEMES: CuratedThemeOption[] = [
  { id: 'lavender-sky', name: 'Lavender Sky' },
  { id: 'mint-peach', name: 'Mint Peach' },
  { id: 'night-ocean', name: 'Night Ocean' },
  { id: 'rose-mist', name: 'Rose Mist' },
  { id: 'forest-haze', name: 'Forest Haze' },
  { id: 'sunset-cloud', name: 'Sunset Cloud' },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isCuratedThemeId(value: string | null): value is CuratedThemeId {
  return CURATED_THEMES.some((theme) => theme.id === value);
}

function getInitialMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_MODE_KEY);
    return isThemeMode(value) ? value : FALLBACK_MODE;
  } catch {
    return FALLBACK_MODE;
  }
}

function getInitialThemeId(): CuratedThemeId {
  try {
    const value = localStorage.getItem(STORAGE_THEME_KEY);
    return isCuratedThemeId(value) ? value : FALLBACK_THEME;
  } catch {
    return FALLBACK_THEME;
  }
}

function getInitialSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function isHexColor(value: string | null): value is string {
  if (!value) return false;
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

function toHexPair(value: string): string {
  return value.length === 1 ? `${value}${value}` : value;
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#([0-9a-fA-F]{3})$/.test(prefixed)) {
    const r = toHexPair(prefixed[1]);
    const g = toHexPair(prefixed[2]);
    const b = toHexPair(prefixed[3]);
    return `#${(r + g + b).toLowerCase()}`;
  }

  if (/^#([0-9a-fA-F]{6})$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }

  return null;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB | null {
  if (!isHexColor(hex)) return null;
  const num = Number.parseInt(hex.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: RGB): number {
  return (
    0.2126 * srgbToLinear(color.r) +
    0.7152 * srgbToLinear(color.g) +
    0.0722 * srgbToLinear(color.b)
  );
}

function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixRgb(base: RGB, mix: RGB, ratio: number): RGB {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return {
    r: base.r * (1 - clampedRatio) + mix.r * clampedRatio,
    g: base.g * (1 - clampedRatio) + mix.g * clampedRatio,
    b: base.b * (1 - clampedRatio) + mix.b * clampedRatio,
  };
}

function loadInitialColorOverrides(): ThemeColorOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_COLOR_OVERRIDES_KEY);
    if (!raw) return EMPTY_OVERRIDES;

    const parsed = JSON.parse(raw) as unknown;
    const safe = typeof parsed === 'object' && parsed !== null
      ? (parsed as Partial<Record<ThemeColorKey, string | null>>)
      : {};
    return {
      accent: isHexColor(safe.accent ?? null) ? safe.accent ?? null : null,
      blob1: isHexColor(safe.blob1 ?? null) ? safe.blob1 ?? null : null,
      blob2: isHexColor(safe.blob2 ?? null) ? safe.blob2 ?? null : null,
    };
  } catch {
    return EMPTY_OVERRIDES;
  }
}

function validateAccent(accentHex: string, resolvedMode: Exclude<ThemeMode, 'system'>): string | null {
  const accent = hexToRgb(accentHex);
  const bg = hexToRgb(resolvedMode === 'dark' ? '#10131a' : '#ffffff');
  if (!accent || !bg) return 'Invalid color value.';

  if (contrastRatio(accent, bg) < 3) {
    return 'Accent needs at least 3:1 contrast against the background.';
  }

  const white: RGB = { r: 255, g: 255, b: 255 };
  const black: RGB = { r: 17, g: 17, b: 17 };
  const bestTextContrast = Math.max(contrastRatio(accent, white), contrastRatio(accent, black));
  if (bestTextContrast < 4.5) {
    return 'Accent must support readable button text (4.5:1).';
  }

  return null;
}

function validateBlob(blobHex: string, resolvedMode: Exclude<ThemeMode, 'system'>): string | null {
  const blob = hexToRgb(blobHex);
  const bg = hexToRgb(resolvedMode === 'dark' ? '#10131a' : '#ffffff');
  const text = hexToRgb(resolvedMode === 'dark' ? '#edf2ff' : '#333333');
  if (!blob || !bg || !text) return 'Invalid color value.';

  const alpha = resolvedMode === 'dark' ? 0.34 : 0.30;
  const blended = mixRgb(bg, blob, alpha);
  if (contrastRatio(text, blended) < 4.5) {
    return 'Gradient color is too close to text; choose a softer tone.';
  }

  return null;
}

function computeOverrideErrors(
  overrides: ThemeColorOverrides,
  resolvedMode: Exclude<ThemeMode, 'system'>,
): ThemeOverrideErrors {
  const next: ThemeOverrideErrors = {};

  if (overrides.accent) {
    const error = validateAccent(overrides.accent, resolvedMode);
    if (error) next.accent = error;
  }

  if (overrides.blob1) {
    const error = validateBlob(overrides.blob1, resolvedMode);
    if (error) next.blob1 = error;
  }

  if (overrides.blob2) {
    const error = validateBlob(overrides.blob2, resolvedMode);
    if (error) next.blob2 = error;
  }

  return next;
}

export function useThemePreferences() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [themeId, setThemeId] = useState<CuratedThemeId>(getInitialThemeId);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getInitialSystemPrefersDark);
  const [colorOverrides, setColorOverrides] = useState<ThemeColorOverrides>(loadInitialColorOverrides);
  const [overrideErrors, setOverrideErrors] = useState<ThemeOverrideErrors>({});

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    setSystemPrefersDark(mql.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const resolvedMode: Exclude<ThemeMode, 'system'> = useMemo(() => {
    if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
    return mode;
  }, [mode, systemPrefersDark]);

  const themeDefaults = useMemo(() => THEME_DEFAULT_COLORS[themeId], [themeId]);

  const colorPickerValues = useMemo<ThemeColorPickerValues>(
    () => ({
      accent: colorOverrides.accent ?? themeDefaults.accent,
      blob1: colorOverrides.blob1 ?? themeDefaults.blob1,
      blob2: colorOverrides.blob2 ?? themeDefaults.blob2,
    }),
    [colorOverrides, themeDefaults],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MODE_KEY, mode);
    } catch {
      // ignore storage failures
    }
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THEME_KEY, themeId);
    } catch {
      // ignore storage failures
    }
  }, [themeId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLOR_OVERRIDES_KEY, JSON.stringify(colorOverrides));
    } catch {
      // ignore storage failures
    }
  }, [colorOverrides]);

  useEffect(() => {
    setOverrideErrors(computeOverrideErrors(colorOverrides, resolvedMode));
  }, [colorOverrides, resolvedMode]);

  const setColorOverride = useCallback((key: ThemeColorKey, rawColor: string) => {
    const normalized = normalizeHexColor(rawColor);
    if (!normalized) {
      setOverrideErrors((prev) => ({ ...prev, [key]: 'Please choose a valid hex color.' }));
      return;
    }

    const nextOverrides: ThemeColorOverrides = {
      ...colorOverrides,
      [key]: normalized,
    };

    const validationError =
      key === 'accent'
        ? validateAccent(normalized, resolvedMode)
        : validateBlob(normalized, resolvedMode);

    if (validationError) {
      setOverrideErrors((prev) => ({ ...prev, [key]: validationError }));
      return;
    }

    setColorOverrides(nextOverrides);
    setOverrideErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [colorOverrides, resolvedMode]);

  const resetColorOverrides = useCallback(() => {
    setColorOverrides(EMPTY_OVERRIDES);
    setOverrideErrors({});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeMode = mode;
    root.dataset.colorScheme = resolvedMode;
    root.dataset.themeId = themeId;
    root.style.colorScheme = resolvedMode;

    // Advanced color overrides are intentionally disabled in the current UI.
    // Ensure no stale inline overrides block curated theme switching.
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-strong');
    root.style.removeProperty('--accent-soft');
    root.style.removeProperty('--accent-contrast');
    root.style.removeProperty('--bg-blob-1');
    root.style.removeProperty('--focus-bg-focus-1');
    root.style.removeProperty('--bg-blob-2');
    root.style.removeProperty('--focus-bg-focus-2');
  }, [mode, resolvedMode, themeId]);

  return {
    mode,
    resolvedMode,
    themeId,
    setMode,
    setThemeId,
    curatedThemes: CURATED_THEMES,
    colorPickerValues,
    colorOverrides,
    hasColorOverrides: Boolean(colorOverrides.accent || colorOverrides.blob1 || colorOverrides.blob2),
    overrideErrors,
    setColorOverride,
    resetColorOverrides,
  };
}
