/** CSS / 屏幕常用 DPI，与 1in = 96px 一致 */
export const SCREEN_DPI = 96;

export function mmToPx(mm: number): number {
  return Math.round((mm * SCREEN_DPI) / 25.4);
}

export function pxToMm(px: number): number {
  return (px * 25.4) / SCREEN_DPI;
}

export const PRESETS = {
  A4: { label: "A4 (210×297 mm)", widthMm: 210, heightMm: 297 },
  A5: { label: "A5 (148×210 mm)", widthMm: 148, heightMm: 210 },
} as const;

export type PresetKey = keyof typeof PRESETS;

export function presetToPx(key: PresetKey): { w: number; h: number } {
  const p = PRESETS[key];
  return { w: mmToPx(p.widthMm), h: mmToPx(p.heightMm) };
}

export function parseCustomToPx(
  w: number,
  h: number,
  unit: "px" | "mm",
  snapEven: boolean
): { w: number; h: number } {
  let wp = unit === "mm" ? mmToPx(w) : Math.round(w);
  let hp = unit === "mm" ? mmToPx(h) : Math.round(h);
  if (snapEven) {
    wp = Math.round(wp / 2) * 2;
    hp = Math.round(hp / 2) * 2;
  }
  return { w: Math.max(32, wp), h: Math.max(32, hp) };
}
