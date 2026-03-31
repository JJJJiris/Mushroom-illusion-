function parseColorToRgb(color: string): [number, number, number] {
  const c = document.createElement("canvas").getContext("2d")!;
  c.fillStyle = color;
  const normalized = c.fillStyle as string;
  const m = normalized.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const hx = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color.trim());
  if (hx) {
    return [parseInt(hx[1], 16), parseInt(hx[2], 16), parseInt(hx[3], 16)];
  }
  return [200, 200, 200];
}

function rgba(color: string, a: number): string {
  const [r, g, b] = parseColorToRgb(color);
  return `rgba(${r},${g},${b},${a})`;
}

export function centroid(pts: [number, number][]): [number, number] {
  if (pts.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return [sx / pts.length, sy / pts.length];
}

export function bbox(
  pts: [number, number][]
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/** 由形状包围盒决定一组弥散中心（径向 mesh） */
function meshCentersForShape(
  bb: { minX: number; minY: number; maxX: number; maxY: number },
  cen: [number, number],
  colorLen: number
): [number, number][] {
  const w = bb.maxX - bb.minX;
  const h = bb.maxY - bb.minY;
  const padX = w * 0.08 + 8;
  const padY = h * 0.08 + 8;
  const minX = bb.minX - padX;
  const minY = bb.minY - padY;
  const maxX = bb.maxX + padX;
  const maxY = bb.maxY + padY;
  const tw = maxX - minX;
  const th = maxY - minY;
  const n = Math.min(10, Math.max(6, colorLen + 4));
  const out: [number, number][] = [[cen[0], cen[1]]];

  for (let k = 1; k < n; k++) {
    const ang = (k * 2.399963) % (Math.PI * 2);
    const rr = Math.min(tw, th) * (0.22 + (k % 4) * 0.11);
    out.push([cen[0] + Math.cos(ang) * rr, cen[1] + Math.sin(ang) * rr]);
  }

  const inset = 0.12;
  out.push(
    [minX + tw * inset, minY + th * inset],
    [maxX - tw * inset, maxY - th * inset],
    [minX + tw * 0.5, minY + th * inset],
    [minX + tw * inset, minY + th * 0.55]
  );
  return out;
}

/** 无手势时的默认弥散中心（铺满画布观感） */
export function defaultFullCanvasCenters(w: number, h: number): [number, number][] {
  return [
    [w * 0.22, h * 0.28],
    [w * 0.78, h * 0.24],
    [w * 0.52, h * 0.52],
    [w * 0.18, h * 0.74],
    [w * 0.82, h * 0.72],
    [w * 0.48, h * 0.14],
    [w * 0.12, h * 0.48],
    [w * 0.88, h * 0.45],
  ];
}

function drawMeshBlobsFullCanvas(
  context: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  centers: [number, number][],
  colors: string[],
  radialCircleScale: number
): void {
  const diag = Math.hypot(destW, destH) || 400;
  const rm = radialCircleScale;
  for (let i = 0; i < centers.length; i++) {
    const [px, py] = centers[i];
    const c0 = colors[i % colors.length];
    const c1 = colors[(i + 1) % colors.length];
    const c2 = colors[(i + 2) % colors.length];
    context.save();
    const rad = diag * (0.32 + (i % 3) * 0.09) * rm;
    const g = context.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, rgba(c0, 1));
    g.addColorStop(0.22, rgba(c0, 0.88));
    g.addColorStop(0.5, rgba(c1, 0.52));
    g.addColorStop(0.78, rgba(c2, 0.22));
    g.addColorStop(1, "rgba(255,255,255,0)");
    context.globalCompositeOperation = i === 0 ? "source-over" : "screen";
    context.globalAlpha = i === 0 ? 1 : 0.72;
    context.fillStyle = g;
    context.fillRect(0, 0, destW, destH);
    context.restore();
  }
}

function drawMeshBlobsInClip(
  context: CanvasRenderingContext2D,
  bb: ReturnType<typeof bbox>,
  centers: [number, number][],
  colors: string[],
  radialCircleScale: number
): void {
  const tw = bb.maxX - bb.minX;
  const th = bb.maxY - bb.minY;
  const diag = Math.hypot(tw, th) || 120;
  const pad = diag * 0.22;
  const rm = radialCircleScale;

  for (let i = 0; i < centers.length; i++) {
    const [px, py] = centers[i];
    const c0 = colors[i % colors.length];
    const c1 = colors[(i + 1) % colors.length];
    const c2 = colors[(i + 2) % colors.length];
    context.save();
    const rad = diag * (0.38 + (i % 3) * 0.1) * rm;
    const g = context.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, rgba(c0, 1));
    g.addColorStop(0.22, rgba(c0, 0.86));
    g.addColorStop(0.5, rgba(c1, 0.54));
    g.addColorStop(0.78, rgba(c2, 0.24));
    g.addColorStop(1, "rgba(255,255,255,0)");
    context.globalCompositeOperation = i === 0 ? "source-over" : "screen";
    context.globalAlpha = i === 0 ? 1 : 0.72;
    context.fillStyle = g;
    context.fillRect(bb.minX - pad, bb.minY - pad, tw + pad * 2, th + pad * 2);
    context.restore();
  }
}

let noiseTile: HTMLCanvasElement | null = null;

function ensureNoiseTile(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const n = 140;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(n, n);
  let seed = 0x9e3779b9;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = (seed & 255) ^ ((seed >>> 8) & 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

export type ImageContourFillStyle = "inward" | "radial";

export type DiffuseOptions = {
  /** 光晕外圈半径倍率（1 = 默认） */
  radialCircleScale: number;
  /** 逻辑像素中的模糊半径 */
  blurPx: number;
  /** 胶片颗粒不透明度 0~0.2 */
  grainAlpha: number;
  /** 降采样系数，越小越快，略损细节 */
  qualityScale: number;
  /** 图片轮廓：沿边界向内的羽化深度（相对包围盒短边，约 0.12～0.85） */
  imageInwardDepth?: number;
  /** 图片轮廓填色：向内渐变（默认）或多中心径向弥散 */
  imageFillStyle?: ImageContourFillStyle;
};

const DEFAULT_DIFFUSE: DiffuseOptions = {
  radialCircleScale: 1,
  blurPx: 42,
  grainAlpha: 0.085,
  qualityScale: 0.55,
};

function makeBuffer(sw: number, sh: number): {
  c: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(sw));
  c.height = Math.max(2, Math.round(sh));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d");
  return { c, ctx };
}

/** 整幅画布弥散渐变（渐变团中心由外部传入，例如手部驱动） */
export function compositeDiffuseFullCanvas(
  dest: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  colors: string[],
  centers: [number, number][],
  opts: Partial<DiffuseOptions> = {}
): void {
  if (colors.length === 0 || centers.length === 0) return;
  const o = { ...DEFAULT_DIFFUSE, ...opts };
  const q = o.qualityScale;
  const sw = destW * q;
  const sh = destH * q;
  const centersS = centers.map(([x, y]) => [x * q, y * q] as [number, number]);

  const { c: raw, ctx: ctxRaw } = makeBuffer(sw, sh);
  ctxRaw.clearRect(0, 0, sw, sh);
  drawMeshBlobsFullCanvas(ctxRaw, sw, sh, centersS, colors, o.radialCircleScale);

  const { c: blurred, ctx: ctxBlur } = makeBuffer(sw, sh);
  ctxBlur.filter = `blur(${o.blurPx * q}px)`;
  ctxBlur.drawImage(raw, 0, 0);
  ctxBlur.filter = "none";

  dest.drawImage(blurred, 0, 0, destW, destH);

  if (o.grainAlpha > 0.001) {
    const tile = ensureNoiseTile();
    const pat = dest.createPattern(tile, "repeat");
    if (pat) {
      dest.save();
      dest.globalAlpha = o.grainAlpha;
      dest.globalCompositeOperation = "soft-light";
      dest.fillStyle = pat;
      dest.fillRect(0, 0, destW, destH);
      dest.restore();
    }
  }
}

function polylineArcLengths(pts: [number, number][]): { lengths: number[]; total: number } {
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lengths.push(total);
  }
  return { lengths, total };
}

function pointAtArcLength(
  pts: [number, number][],
  lengths: number[],
  s: number
): [number, number] {
  let j = 0;
  while (j < lengths.length - 1 && lengths[j + 1] < s) j++;
  const segLen = lengths[j + 1] - lengths[j];
  const u = segLen > 1e-6 ? (s - lengths[j]) / segLen : 0;
  return [
    pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u,
    pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u,
  ];
}

/** 闭合多边形周长上均匀采样（画布/缩放坐标） */
function resampleClosedPolygon(pts: [number, number][], count: number): [number, number][] {
  const n = pts.length;
  if (n < 3 || count < 1) return [];
  const segLen: number[] = [];
  let L = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const d = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
    segLen.push(d);
    L += d;
  }
  if (L < 1e-6) return [pts[0]];
  const out: [number, number][] = [];
  for (let k = 0; k < count; k++) {
    let s = (k / count) * L;
    let i = 0;
    while (i < n && s > segLen[i] + 1e-9) {
      s -= segLen[i];
      i++;
    }
    if (i >= n) i = n - 1;
    const i0 = i;
    const i1 = (i0 + 1) % n;
    const len = segLen[i0] || 1;
    const u = Math.min(1, Math.max(0, s / len));
    out.push([
      pts[i0][0] + (pts[i1][0] - pts[i0][0]) * u,
      pts[i0][1] + (pts[i1][1] - pts[i0][1]) * u,
    ]);
  }
  return out;
}

function polygonPerimeter(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  let L = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    L += Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
  }
  return L;
}

/** 沿剪影边界向内的径向羽化（多段叠加，裁剪在多边形内） */
function drawInwardBoundaryGradient(
  ctx: CanvasRenderingContext2D,
  poly: [number, number][],
  bb: ReturnType<typeof bbox>,
  colors: string[],
  depthFrac: number,
  radialScale: number
): void {
  const tw = bb.maxX - bb.minX;
  const th = bb.maxY - bb.minY;
  const pad = Math.hypot(tw, th) * 0.06;
  const L = polygonPerimeter(poly);
  const count = Math.round(Math.min(150, Math.max(40, L / 8)));
  const samples = resampleClosedPolygon(poly, count);
  const depth = Math.min(tw, th) * depthFrac * radialScale;

  for (let i = 0; i < samples.length; i++) {
    const [px, py] = samples[i];
    const c0 = colors[i % colors.length];
    const c1 = colors[(i + 1) % colors.length];
    const c2 = colors[(i + 2) % colors.length];
    ctx.save();
    const rad = depth * (0.9 + (i % 6) * 0.035);
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, rgba(c0, 1));
    g.addColorStop(0.32, rgba(c1, 0.68));
    g.addColorStop(0.66, rgba(c2, 0.32));
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = i === 0 ? "source-over" : "screen";
    ctx.globalAlpha = i === 0 ? 1 : 0.55;
    ctx.fillStyle = g;
    ctx.fillRect(bb.minX - pad, bb.minY - pad, tw + pad * 2, th + pad * 2);
    ctx.restore();
  }
}

function resampleSpineUniform(
  pts: [number, number][],
  count: number
): { samples: [number, number][]; sArr: number[]; total: number } {
  if (pts.length < 2) return { samples: [], sArr: [], total: 0 };
  const { lengths, total } = polylineArcLengths(pts);
  if (total < 1e-4) return { samples: [pts[0]], sArr: [0], total: 0 };
  const samples: [number, number][] = [];
  const sArr: number[] = [];
  for (let k = 0; k < count; k++) {
    const s = count === 1 ? 0 : (k / (count - 1)) * total;
    sArr.push(s);
    samples.push(pointAtArcLength(pts, lengths, s));
  }
  return { samples, sArr, total };
}

function tangentFrameAt(
  samples: [number, number][],
  i: number
): { tx: number; ty: number; nx: number; ny: number } {
  const n = samples.length;
  const i0 = Math.max(0, i - 1);
  const i1 = Math.min(n - 1, i + 1);
  let vx = samples[i1][0] - samples[i0][0];
  let vy = samples[i1][1] - samples[i0][1];
  const len = Math.hypot(vx, vy) || 1;
  const tx = vx / len;
  const ty = vy / len;
  return { tx, ty, nx: -ty, ny: tx };
}

function drawFlowBlobLayer(
  ctx: CanvasRenderingContext2D,
  sw: number,
  sh: number,
  samples: [number, number][],
  sArr: number[],
  totalLen: number,
  colors: string[],
  radialCircleScale: number,
  undulationPhase: number,
  ampMul: number
): void {
  const diag = Math.hypot(sw, sh) || 100;
  const rm = radialCircleScale;
  const amp = Math.min(sw, sh) * 0.07 * ampMul;
  const denom = totalLen + 48;
  const freq1 = (Math.PI * 2 * 3.1) / denom;
  const freq2 = (Math.PI * 2 * 6.8) / denom;

  for (let i = 0; i < samples.length; i++) {
    const s = sArr[i];
    const { nx, ny } = tangentFrameAt(samples, i);
    const w1 = Math.sin(s * freq1 + undulationPhase);
    const w2 = 0.5 * Math.sin(s * freq2 - undulationPhase * 1.33 + 1.05);
    const w3 = 0.24 * Math.sin(s * freq1 * 2.05 + undulationPhase * 0.47);
    const off = amp * (w1 + w2 + w3);
    const cx = samples[i][0] + nx * off;
    const cy = samples[i][1] + ny * off;
    const c0 = colors[i % colors.length];
    const c1 = colors[(i + 1) % colors.length];
    const c2 = colors[(i + 2) % colors.length];
    ctx.save();
    const rad = diag * (0.082 + (i % 5) * 0.014) * rm;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, rgba(c0, 1));
    g.addColorStop(0.28, rgba(c1, 0.58));
    g.addColorStop(0.62, rgba(c2, 0.24));
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = i === 0 ? "source-over" : "screen";
    ctx.globalAlpha = i === 0 ? 1 : 0.64;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sw, sh);
    ctx.restore();
  }
}

/**
 * 尚无食指轨迹时的默认「隐形曲线」，随 phase 形变，便于预览整屏流动感。
 */
export function defaultFlowSpine(
  w: number,
  h: number,
  phase: number
): [number, number][] {
  const n = 56;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = w * (0.05 + 0.9 * t);
    const y =
      h * 0.5 +
      Math.sin(t * Math.PI * 2 * 2.25 + phase * 0.88) * h * 0.24 +
      Math.sin(t * Math.PI * 2 * 6.1 + phase * 1.22) * h * 0.058;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * 沿一条曲线做法线方向起伏的径向弥散，铺满画布；曲线由手部轨迹或默认值提供。
 */
export function compositeDiffuseFlowSpine(
  dest: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  spineLogical: [number, number][],
  colors: string[],
  undulationPhase: number,
  opts: Partial<DiffuseOptions> = {}
): void {
  if (colors.length === 0) return;
  let spine = spineLogical;
  if (spine.length === 1) {
    const p = spine[0];
    spine = [
      [p[0] - 6, p[1]],
      [p[0] + 6, p[1]],
    ];
  }
  if (spine.length < 2) return;

  const o = { ...DEFAULT_DIFFUSE, ...opts };
  const q = o.qualityScale;
  const sw = destW * q;
  const sh = destH * q;
  const spineS = spine.map(([x, y]) => [x * q, y * q] as [number, number]);

  const { total: pathTotal } = polylineArcLengths(spineS);
  const segCount = Math.round(Math.min(104, Math.max(32, pathTotal / 14 + 22)));
  const { samples, sArr, total } = resampleSpineUniform(spineS, segCount);
  if (samples.length < 2) return;

  const { c: raw, ctx: ctxRaw } = makeBuffer(sw, sh);
  ctxRaw.clearRect(0, 0, sw, sh);
  drawFlowBlobLayer(
    ctxRaw,
    sw,
    sh,
    samples,
    sArr,
    total || pathTotal,
    colors,
    o.radialCircleScale,
    undulationPhase,
    1
  );
  drawFlowBlobLayer(
    ctxRaw,
    sw,
    sh,
    samples,
    sArr,
    total || pathTotal,
    colors,
    o.radialCircleScale,
    undulationPhase + 1.15,
    0.52
  );

  const { c: blurred, ctx: ctxBlur } = makeBuffer(sw, sh);
  ctxBlur.filter = `blur(${o.blurPx * q}px)`;
  ctxBlur.drawImage(raw, 0, 0);
  ctxBlur.filter = "none";

  dest.drawImage(blurred, 0, 0, destW, destH);

  if (o.grainAlpha > 0.001) {
    const tile = ensureNoiseTile();
    const pat = dest.createPattern(tile, "repeat");
    if (pat) {
      dest.save();
      dest.globalAlpha = o.grainAlpha;
      dest.globalCompositeOperation = "soft-light";
      dest.fillStyle = pat;
      dest.fillRect(0, 0, destW, destH);
      dest.restore();
    }
  }
}

/** 多边形区域上的渐变弥散 + 叠加到目标（白底上） */
export function compositeDiffusePolygon(
  dest: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  poly: [number, number][],
  colors: string[],
  opts: Partial<DiffuseOptions> = {}
): void {
  if (poly.length < 3 || colors.length === 0) return;
  const o = { ...DEFAULT_DIFFUSE, ...opts };
  const cen = centroid(poly);
  const q = o.qualityScale;
  const sw = destW * q;
  const sh = destH * q;

  const scalePoly = (p: [number, number][]): [number, number][] =>
    p.map(([x, y]) => [x * q, y * q]);

  const polyS = scalePoly(poly);
  const bbS = bbox(polyS);
  const cenS: [number, number] = [cen[0] * q, cen[1] * q];

  const { c: raw, ctx: ctxRaw } = makeBuffer(sw, sh);
  ctxRaw.scale(1, 1);
  ctxRaw.clearRect(0, 0, sw, sh);
  ctxRaw.beginPath();
  ctxRaw.moveTo(polyS[0][0], polyS[0][1]);
  for (let i = 1; i < polyS.length; i++) ctxRaw.lineTo(polyS[i][0], polyS[i][1]);
  ctxRaw.closePath();
  ctxRaw.clip();

  const fillStyle: ImageContourFillStyle = o.imageFillStyle ?? "inward";
  const inwardDepth = Math.min(0.88, Math.max(0.12, o.imageInwardDepth ?? 0.4));

  if (fillStyle === "inward") {
    drawInwardBoundaryGradient(
      ctxRaw,
      polyS,
      bbS,
      colors,
      inwardDepth,
      o.radialCircleScale
    );
  } else {
    const centers = meshCentersForShape(bbS, cenS, colors.length);
    drawMeshBlobsInClip(ctxRaw, bbS, centers, colors, o.radialCircleScale);
  }

  const { c: blurred, ctx: ctxBlur } = makeBuffer(sw, sh);
  const shapeBlur = o.blurPx * 0.72;
  ctxBlur.filter = `blur(${shapeBlur * q}px)`;
  ctxBlur.drawImage(raw, 0, 0);
  ctxBlur.filter = "none";

  dest.drawImage(blurred, 0, 0, destW, destH);

  if (o.grainAlpha > 0.001) {
    const tile = ensureNoiseTile();
    const pat = dest.createPattern(tile, "repeat");
    if (pat) {
      dest.save();
      dest.beginPath();
      dest.moveTo(poly[0][0], poly[0][1]);
      for (let k = 1; k < poly.length; k++) dest.lineTo(poly[k][0], poly[k][1]);
      dest.closePath();
      dest.clip();
      dest.globalAlpha = o.grainAlpha;
      dest.globalCompositeOperation = "soft-light";
      dest.fillStyle = pat;
      dest.fillRect(0, 0, destW, destH);
      dest.restore();
    }
  }
}

/** 开放轨迹：粗笔刷 mask + 弥散填色 */
export function compositeDiffuseTrail(
  dest: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  points: [number, number][],
  colors: string[],
  lineWidth: number,
  opts: Partial<DiffuseOptions> = {}
): void {
  if (points.length < 2 || colors.length === 0) return;
  const o = { ...DEFAULT_DIFFUSE, ...opts };
  const cen = centroid(points);
  const q = o.qualityScale;
  const sw = destW * q;
  const sh = destH * q;
  const lw = lineWidth * q;

  const scalePts = points.map(([x, y]) => [x * q, y * q] as [number, number]);
  const bbS = bbox(scalePts);
  const cenS: [number, number] = [cen[0] * q, cen[1] * q];

  const { c: diffuse, ctx: dctx } = makeBuffer(sw, sh);
  dctx.clearRect(0, 0, sw, sh);
  const centers = meshCentersForShape(bbS, cenS, colors.length);
  drawMeshBlobsInClip(dctx, bbS, centers, colors, o.radialCircleScale);

  const { c: mask, ctx: mctx } = makeBuffer(sw, sh);
  mctx.clearRect(0, 0, sw, sh);
  mctx.strokeStyle = "#fff";
  mctx.lineWidth = lw;
  mctx.lineCap = "round";
  mctx.lineJoin = "round";
  mctx.beginPath();
  mctx.moveTo(scalePts[0][0], scalePts[0][1]);
  for (let i = 1; i < scalePts.length; i++) mctx.lineTo(scalePts[i][0], scalePts[i][1]);
  mctx.stroke();

  dctx.globalCompositeOperation = "destination-in";
  dctx.drawImage(mask, 0, 0);
  dctx.globalCompositeOperation = "source-over";

  const { c: blurred, ctx: bctx } = makeBuffer(sw, sh);
  bctx.filter = `blur(${o.blurPx * q * 0.92}px)`;
  bctx.drawImage(diffuse, 0, 0);
  bctx.filter = "none";

  dest.drawImage(blurred, 0, 0, destW, destH);

  if (o.grainAlpha > 0.001) {
    const tile = ensureNoiseTile();
    const pat = dest.createPattern(tile, "repeat");
    if (pat) {
      const bbPad = bbox(points);
      dest.save();
      dest.beginPath();
      const gx = bbPad.minX - lineWidth * 2;
      const gy = bbPad.minY - lineWidth * 2;
      const gw = bbPad.maxX - bbPad.minX + lineWidth * 4;
      const gh = bbPad.maxY - bbPad.minY + lineWidth * 4;
      dest.rect(Math.max(0, gx), Math.max(0, gy), gw, gh);
      dest.clip();
      dest.globalAlpha = o.grainAlpha;
      dest.globalCompositeOperation = "soft-light";
      dest.fillStyle = pat;
      dest.fillRect(0, 0, destW, destH);
      dest.restore();
    }
  }
}
