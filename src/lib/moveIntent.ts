import type { Stroke } from '../types';
import type { Bounds } from './diffStrokes';

function centroid(b: Bounds): [number, number] {
  return [b.x + b.w / 2, b.y + b.h / 2];
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function boundsArea(b: Bounds): number {
  return b.w * b.h;
}

function boxesNear(a: Bounds, b: Bounds, gap: number): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x <= bx2 + gap && bx2 >= a.x - gap && a.y <= by2 + gap && by2 >= a.y - gap;
}

/** Guess why something was repositioned — for diff labels and AI context. */
export function inferMoveIntent(
  beforeBounds: Bounds | undefined,
  afterBounds: Bounds,
  beforeStrokes: Stroke[],
  afterStrokes: Stroke[],
  allAfterStrokes: Stroke[],
): string {
  if (!beforeBounds) return 'repositioned on canvas';

  const displacement = dist(centroid(beforeBounds), centroid(afterBounds));
  if (displacement < 12) return 'fine-tuned placement';

  let largestOther: Bounds | null = null;
  let largestArea = boundsArea(afterBounds) * 1.15;

  for (const s of allAfterStrokes) {
    if (s.tool === 'eraser') continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of s.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const half = s.size / 2 + 8;
    const b: Bounds = {
      x: minX - half,
      y: minY - half,
      w: maxX - minX + half * 2,
      h: maxY - minY + half * 2,
    };
    const area = boundsArea(b);
    if (area > largestArea && !boxesNear(b, afterBounds, 4)) {
      largestArea = area;
      largestOther = b;
    }
  }

  if (largestOther && boxesNear(afterBounds, largestOther, 36)) {
    return 'moved to join or complete a nearby shape';
  }

  const beforeArea = boundsArea(beforeBounds);
  const afterArea = boundsArea(afterBounds);
  if (afterArea > beforeArea * 1.12) {
    return 'moved and expanded to fit the layout';
  }

  if (displacement >= 80) return 'moved to a new area of the canvas';
  return 'repositioned to refine the drawing';
}

export function formatMoveIntentDetail(
  baseDetail: string,
  intent: string,
): string {
  return `${baseDetail} · ${intent}`;
}
