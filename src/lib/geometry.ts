/** Ramer–Douglas–Peucker 折线简化 */
export function rdp(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points.slice();
  let idx = 0;
  let maxD = 0;
  const [p0, p1] = [points[0], points[points.length - 1]];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], p0, p1);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const a = rdp(points.slice(0, idx + 1), epsilon);
    const b = rdp(points.slice(idx), epsilon);
    return a.slice(0, -1).concat(b);
  }
  return [p0, p1];
}

function perpDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const nx = ax + t * dx;
  const ny = ay + t * dy;
  return Math.hypot(px - nx, py - ny);
}

export function dist2(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}
