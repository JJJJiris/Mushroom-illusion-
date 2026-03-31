/** 手腕—拇指—四指—回到手腕的封闭轮廓（画布像素坐标） */
export const HAND_OUTLINE_LMS = [0, 1, 2, 3, 4, 8, 12, 16, 20, 19, 18, 17, 5, 0] as const;

/** 食指指尖 landmark index */
export const INDEX_TIP_LM = 8;

export type NormPoint = { x: number; y: number; z?: number };

/** 归一化 0..1 → 画布像素 */
export function normToCanvas(
  x: number,
  y: number,
  cw: number,
  ch: number,
  mirror: boolean
): [number, number] {
  const nx = mirror ? 1 - x : x;
  return [nx * cw, y * ch];
}

export function outlineFromLandmarks(
  lms: NormPoint[],
  cw: number,
  ch: number,
  mirror: boolean
): [number, number][] {
  const pts: [number, number][] = [];
  for (const i of HAND_OUTLINE_LMS) {
    const p = lms[i];
    if (!p) continue;
    pts.push(normToCanvas(p.x, p.y, cw, ch, mirror));
  }
  return pts;
}
