import { rdp } from "./geometry";

const MAX_ANALYSIS_SIDE = 480;

export type ImageExtractMode = "edge" | "silhouette" | "auto";

function otsuThreshold(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const n = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let varMax = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const vb = wB * wF * (mB - mF) * (mB - mF);
    if (vb > varMax) {
      varMax = vb;
      threshold = t;
    }
  }
  return threshold;
}

function meanCornerGray(gray: Uint8Array, w: number, h: number): number {
  const s =
    gray[0] +
    gray[w - 1] +
    gray[(h - 1) * w] +
    gray[(h - 1) * w + w - 1];
  return s / 4;
}

function dilateBinary(mask: Uint8Array, w: number, h: number, iters: number): Uint8Array {
  let cur = mask;
  for (let it = 0; it < iters; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (cur[i]) {
          next[i] = 1;
          continue;
        }
        if (
          cur[i - 1] ||
          cur[i + 1] ||
          cur[i - w] ||
          cur[i + w] ||
          cur[i - w - 1] ||
          cur[i - w + 1] ||
          cur[i + w - 1] ||
          cur[i + w + 1]
        )
          next[i] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

function erodeBinary(mask: Uint8Array, w: number, h: number, iters: number): Uint8Array {
  let cur = mask;
  for (let it = 0; it < iters; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!cur[i]) continue;
        if (
          cur[i - 1] &&
          cur[i + 1] &&
          cur[i - w] &&
          cur[i + w] &&
          cur[i - w - 1] &&
          cur[i - w + 1] &&
          cur[i + w - 1] &&
          cur[i + w + 1]
        )
          next[i] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

/** 闭运算：弥合剪影内部小缝、去孤立噪点前的细长断裂 */
function closeBinary(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius < 1) return mask.slice();
  return erodeBinary(dilateBinary(mask, w, h, radius), w, h, radius);
}

/** 仅保留面积最大的前景连通域（剪影主体） */
function largestForegroundComponent(mask: Uint8Array, w: number, h: number): Uint8Array {
  let bestMask = new Uint8Array(w * h);
  let best = 0;
  const seen = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = y * w + x;
      if (mask[s] !== 1 || seen[s]) continue;
      const comp = new Uint8Array(w * h);
      let cnt = 0;
      const q: number[] = [s];
      seen[s] = 1;
      comp[s] = 1;
      while (q.length) {
        const i = q.pop()!;
        cnt++;
        const cx = i % w;
        const cy = (i / w) | 0;
        if (cx > 0) {
          const ni = i - 1;
          if (mask[ni] === 1 && !seen[ni]) {
            seen[ni] = 1;
            comp[ni] = 1;
            q.push(ni);
          }
        }
        if (cx < w - 1) {
          const ni = i + 1;
          if (mask[ni] === 1 && !seen[ni]) {
            seen[ni] = 1;
            comp[ni] = 1;
            q.push(ni);
          }
        }
        if (cy > 0) {
          const ni = i - w;
          if (mask[ni] === 1 && !seen[ni]) {
            seen[ni] = 1;
            comp[ni] = 1;
            q.push(ni);
          }
        }
        if (cy < h - 1) {
          const ni = i + w;
          if (mask[ni] === 1 && !seen[ni]) {
            seen[ni] = 1;
            comp[ni] = 1;
            q.push(ni);
          }
        }
      }
      if (cnt > best) {
        best = cnt;
        bestMask = comp;
      }
    }
  }
  return best > 0 ? bestMask : mask.slice();
}

function traceMaskOuterContour(mask: Uint8Array, w: number, h: number): [number, number][] {
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1 && (y === 0 || mask[(y - 1) * w + x] === 0)) {
        sx = x;
        sy = y;
        break outer;
      }
    }
  }
  if (sx < 0) return [];
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];
  const path: [number, number][] = [];
  let x = sx;
  let y = sy;
  let dir = 0;
  for (let s = 0; s < w * h * 10; s++) {
    path.push([x, y]);
    let found = false;
    for (let t = 0; t < 8; t++) {
      const d = (dir + t + 5) % 8;
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) {
        x = nx;
        y = ny;
        dir = d;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (x === sx && y === sy && path.length > 4) break;
  }
  return path;
}

function polygonAreaApprox(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  let a = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(a * 0.5);
}

function grayscale(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const g = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < data.length; i++, p += 4) {
    g[i] = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
  }
  return g;
}

function boxBlurGray(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius < 1) return src.slice();
  const out = new Uint8Array(w * h);
  const tmp = new Uint8Array(w * h);
  const r = radius;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.max(0, Math.min(w - 1, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = Math.round(sum / (2 * r + 1));
      const x1 = x - r;
      const x2 = x + r + 1;
      if (x1 >= 0) sum -= src[y * w + x1];
      if (x2 < w) sum += src[y * w + x2];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.max(0, Math.min(h - 1, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(sum / (2 * r + 1));
      const y1 = y - r;
      const y2 = y + r + 1;
      if (y1 >= 0) sum -= tmp[y1 * w + x];
      if (y2 < h) sum += tmp[y2 * w + x];
    }
  }
  return out;
}

function sobelMagnitude(gray: Uint8Array, w: number, h: number): Float32Array {
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] +
        gray[i - w + 1] +
        -2 * gray[i - 1] +
        2 * gray[i + 1] +
        -gray[i + w - 1] +
        gray[i + w + 1];
      const gy =
        -gray[i - w - 1] +
        -2 * gray[i - w] +
        -gray[i - w + 1] +
        gray[i + w - 1] +
        2 * gray[i + w] +
        gray[i + w + 1];
      mag[i] = Math.hypot(gx, gy);
    }
  }
  return mag;
}

function thresholdEdges(mag: Float32Array, w: number, h: number, t: number): Uint8Array {
  const b = new Uint8Array(w * h);
  const thr = (t / 100) * 255;
  for (let i = 0; i < mag.length; i++) b[i] = mag[i] >= thr ? 1 : 0;
  return b;
}

/** Moore 邻域追踪，输入边缘二值（0/1），返回闭合或开路径 */
function traceEdgeContour(edge: Uint8Array, w: number, h: number): [number, number][] {
  let sx = -1;
  let sy = -1;
  outer: for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (edge[y * w + x]) {
        sx = x;
        sy = y;
        break outer;
      }
    }
  }
  if (sx < 0) return [];

  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];
  const path: [number, number][] = [];
  let x = sx;
  let y = sy;
  let dir = 0;
  const maxSteps = w * h * 4;
  for (let s = 0; s < maxSteps; s++) {
    path.push([x, y]);
    let found = false;
    for (let t = 0; t < 8; t++) {
      const d = (dir + t + 5) % 8;
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && edge[ny * w + nx]) {
        x = nx;
        y = ny;
        dir = d;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (x === sx && y === sy && path.length > 2) break;
  }
  return path;
}

export type ImageFit = {
  x: number;
  y: number;
  scale: number;
  iw: number;
  ih: number;
};

export function computeContainFit(
  iw: number,
  ih: number,
  cw: number,
  ch: number
): ImageFit {
  const scale = Math.min(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (cw - w) / 2;
  const y = (ch - h) / 2;
  return { x, y, scale, iw, ih };
}

function extractSilhouettePolyline(
  gray: Uint8Array,
  w: number,
  h: number,
  simplifyEpsilon: number
): [number, number][] {
  const t = otsuThreshold(gray);
  const cornerMean = meanCornerGray(gray, w, h);
  const darkSubject = cornerMean > t;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    mask[i] = darkSubject ? (gray[i] < t ? 1 : 0) : (gray[i] > t ? 1 : 0);
  }
  let fg = closeBinary(mask, w, h, 1);
  fg = largestForegroundComponent(fg, w, h);
  let raw = traceMaskOuterContour(fg, w, h);
  if (raw.length < 12) {
    const dil = dilateBinary(fg, w, h, 1);
    raw = traceMaskOuterContour(dil, w, h);
  }
  if (raw.length < 12) {
    raw = traceMaskOuterContour(mask, w, h);
  }
  const eps = simplifyEpsilon * Math.max(w, h);
  return raw.length > 2 ? rdp(raw, eps) : raw;
}

function extractEdgePolyline(
  gray: Uint8Array,
  w: number,
  h: number,
  edgeThreshold: number,
  simplifyEpsilon: number
): [number, number][] {
  const mag = sobelMagnitude(gray, w, h);
  const edge = thresholdEdges(mag, w, h, edgeThreshold);
  let raw = traceEdgeContour(edge, w, h);
  if (raw.length < 8) {
    const alt = traceLuminanceContour(gray, w, h, 128);
    if (alt.length > raw.length) raw = alt;
  }
  const eps = simplifyEpsilon * Math.max(w, h);
  return raw.length > 2 ? rdp(raw, eps) : raw;
}

/** 从 HTMLImageElement 或 ImageBitmap 提取主轮廓（画布像素坐标） */
export function extractContourFromImageSource(
  source: CanvasImageSource,
  canvasW: number,
  canvasH: number,
  options: {
    edgeThreshold: number;
    blurRadius: number;
    simplifyEpsilon: number;
    extractMode?: ImageExtractMode;
  }
): { contour: [number, number][]; fit: ImageFit } {
  const nw = source instanceof HTMLImageElement ? source.naturalWidth : (source as ImageBitmap).width;
  const nh = source instanceof HTMLImageElement ? source.naturalHeight : (source as ImageBitmap).height;
  const fit = computeContainFit(nw, nh, canvasW, canvasH);
  const mode: ImageExtractMode = options.extractMode ?? "auto";

  const side = Math.max(nw, nh);
  const scaleDown = side > MAX_ANALYSIS_SIDE ? MAX_ANALYSIS_SIDE / side : 1;
  const w = Math.max(8, Math.round(nw * scaleDown));
  const h = Math.max(8, Math.round(nh * scaleDown));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return { contour: [], fit };
  ctx.drawImage(source, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  let gray = grayscale(imgData.data, w, h);
  if (options.blurRadius > 0) {
    gray = boxBlurGray(gray, w, h, options.blurRadius);
  }

  const toCanvas = (px: number, py: number): [number, number] => [
    fit.x + (px / w) * (nw * fit.scale),
    fit.y + (py / h) * (nh * fit.scale),
  ];

  let analysisPts: [number, number][];

  if (mode === "edge") {
    analysisPts = extractEdgePolyline(gray, w, h, options.edgeThreshold, options.simplifyEpsilon);
  } else if (mode === "silhouette") {
    analysisPts = extractSilhouettePolyline(gray, w, h, options.simplifyEpsilon);
  } else {
    const s = extractSilhouettePolyline(gray, w, h, options.simplifyEpsilon);
    const e = extractEdgePolyline(gray, w, h, options.edgeThreshold, options.simplifyEpsilon);
    const imgArea = w * h;
    const ratioS = polygonAreaApprox(s) / imgArea;
    const silhouettePlausible =
      s.length >= 10 && ratioS > 0.02 && ratioS < 0.97;
    if (silhouettePlausible) {
      analysisPts = s;
    } else if (e.length >= 8) {
      analysisPts = e;
    } else {
      analysisPts = s.length >= e.length ? s : e;
    }
  }

  const contour = analysisPts.map(([px, py]) => toCanvas(px, py));
  return { contour, fit };
}

function traceLuminanceContour(gray: Uint8Array, w: number, h: number, thr: number): [number, number][] {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] < thr ? 1 : 0;
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        if (y === 0 || mask[(y - 1) * w + x] === 0) {
          sx = x;
          sy = y;
          break outer;
        }
      }
    }
  }
  if (sx < 0) return [];
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];
  const path: [number, number][] = [];
  let x = sx;
  let y = sy;
  let dir = 0;
  for (let s = 0; s < w * h * 8; s++) {
    path.push([x, y]);
    let found = false;
    for (let t = 0; t < 8; t++) {
      const d = (dir + t + 5) % 8;
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) {
        x = nx;
        y = ny;
        dir = d;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (x === sx && y === sy && path.length > 4) break;
  }
  return path;
}

export function sampleDominantColors(
  source: CanvasImageSource,
  count: number
): string[] {
  const nw = source instanceof HTMLImageElement ? source.naturalWidth : (source as ImageBitmap).width;
  const nh = source instanceof HTMLImageElement ? source.naturalHeight : (source as ImageBitmap).height;
  const sw = Math.min(64, nw);
  const sh = Math.min(64, nh);
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(source, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const buckets = new Map<string, number>();
  const step = 4 * 3;
  for (let p = 0; p < data.length; p += step) {
    const r = (data[p] >> 4) * 16;
    const g = (data[p + 1] >> 4) * 16;
    const b = (data[p + 2] >> 4) * 16;
    const key = `#${((1 << 24) + r * 65536 + g * 256 + b).toString(16).slice(1)}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, Math.max(2, count)).map(([k]) => k);
}
