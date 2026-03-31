export const RECOMMENDED_PALETTES: { id: string; label: string; colors: string[] }[] = [
  { id: "warm", label: "暖色渐变", colors: ["#ff6b35", "#f7c59f", "#ffead0"] },
  { id: "cool", label: "冷色海洋", colors: ["#0d1b2a", "#415a77", "#778da9", "#e0e1dd"] },
  { id: "neon", label: "霓虹", colors: ["#ff00aa", "#00fff0", "#7b2cbf"] },
  { id: "earth", label: "大地", colors: ["#3d2914", "#8b5a2b", "#d4a574", "#f5e6d3"] },
  { id: "forest", label: "森林", colors: ["#1a3c28", "#2d6a4f", "#52b788", "#d8f3dc"] },
  { id: "sunset", label: "落日", colors: ["#ff512f", "#dd2476", "#ffc371"] },
  { id: "mono", label: "单色灰阶", colors: ["#111111", "#6b6b6b", "#f0f0f0"] },
  { id: "pastel", label: "莫兰迪 pastel", colors: ["#c9ada7", "#9a8c98", "#f2e9e4", "#4a4e69"] },
];

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hr = h / 360;
  const sr = s / 100;
  const lr = l / 100;
  if (sr === 0) {
    const v = Math.round(lr * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = lr < 0.5 ? lr * (1 + sr) : lr + sr - lr * sr;
  const p = 2 * lr - q;
  const r = hue2rgb(p, q, hr + 1 / 3);
  const g = hue2rgb(p, q, hr);
  const b = hue2rgb(p, q, hr - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** 生成 3～4 个和谐 HSL 色（#RRGGBB，兼容取色器） */
export function randomHarmoniousPalette(count = 4): string[] {
  const baseH = Math.random() * 360;
  const s = 55 + Math.random() * 35;
  const l1 = 32 + Math.random() * 15;
  const l2 = 52 + Math.random() * 22;
  const hues = [0, 32, 72, 180].map((o) => (baseH + o) % 360);
  const n = clamp(count, 2, 4);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const h = hues[i % hues.length];
    const l = i % 2 === 0 ? l1 : l2;
    const [r, g, b] = hslToRgb(h, s, l);
    out.push(rgbToHex(r, g, b));
  }
  return out;
}

export function stopsForCanvas(colors: string[]): { offset: number; color: string }[] {
  const n = colors.length;
  if (n === 0) return [{ offset: 0, color: "#000" }, { offset: 1, color: "#fff" }];
  return colors.map((c, i) => ({
    offset: n === 1 ? 0 : i / (n - 1),
    color: c,
  }));
}

export function applyStops(
  g: CanvasGradient,
  colors: string[]
): void {
  const stops = stopsForCanvas(colors);
  for (const s of stops) g.addColorStop(s.offset, s.color);
}
