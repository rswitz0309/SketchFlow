import type { Stroke } from '../types';
import { CANVAS_BG } from '../types';
import { eraserIntersectsStroke } from './strokeHitTest';

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function eraserHitRadius(eraser: Stroke): number {
  const width = eraser.tool === 'brush' ? eraser.size * 1.15 : eraser.size;
  return width / 2 + 6;
}

function sampleEraserPoints(eraser: Stroke): [number, number][] {
  const pts = eraser.points;
  if (pts.length <= 1) return pts;
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    out.push([ax, ay]);
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len / 4));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  return out;
}

function pointInEraserZone(
  px: number,
  py: number,
  eraser: Stroke,
  extra: number,
): boolean {
  const samples = sampleEraserPoints(eraser);
  const r = eraserHitRadius(eraser) + extra;
  for (const [ex, ey] of samples) {
    if (dist(px, py, ex, ey) <= r) return true;
  }
  return false;
}

function strokeInkRadius(stroke: Stroke): number {
  const width = stroke.tool === 'brush' ? stroke.size * 1.15 : stroke.size;
  return width / 2;
}

function appendSampledSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  eraser: Stroke,
  extra: number,
  current: [number, number][],
  fragments: [number, number][][],
): [number, number][] {
  const len = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(len / 3));
  let cur = current;

  const flush = () => {
    if (cur.length > 0) {
      fragments.push(cur);
      cur = [];
    }
  };

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (pointInEraserZone(x, y, eraser, extra)) {
      flush();
    } else {
      if (cur.length === 0 || dist(cur[cur.length - 1][0], cur[cur.length - 1][1], x, y) > 0.5) {
        cur.push([x, y]);
      }
    }
  }
  return cur;
}

/** Split a stroke into fragments outside the eraser corridor. */
export function splitStrokeByEraser(stroke: Stroke, eraser: Stroke): Stroke[] {
  if (stroke.points.length === 0) return [];

  const extra = strokeInkRadius(stroke);
  const fragments: [number, number][][] = [];
  let current: [number, number][] = [];

  const pts = stroke.points;
  if (pts.length === 1) {
    const [x, y] = pts[0];
    if (!pointInEraserZone(x, y, eraser, extra)) {
      return [{ ...stroke, points: pts }];
    }
    return [];
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    current = appendSampledSegment(ax, ay, bx, by, eraser, extra, current, fragments);
  }

  if (current.length > 0) fragments.push(current);

  return fragments
    .filter((pts) => pts.length > 0)
    .map((points) => ({ ...stroke, points }));
}

function isCanvasColoredInk(color: string): boolean {
  const c = color.trim().toLowerCase();
  if (c === 'white' || c === 'canvas') return true;
  if (c === '#fff' || c === '#ffffff' || c === CANVAS_BG.toLowerCase()) return true;
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    const full =
      h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if (r >= 250 && g >= 250 && b >= 250) return true;
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const [, rs, gs, bs] = rgb;
    if (+rs >= 250 && +gs >= 250 && +bs >= 250) return true;
  }
  return false;
}

/** Drop eraser artifacts and canvas-colored “ink” (legacy white strokes). */
export function isEraserArtifact(stroke: Stroke): boolean {
  if (stroke.tool === 'eraser') return true;
  return isCanvasColoredInk(stroke.color);
}

export function sanitizeDrawableStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.filter((s) => !isEraserArtifact(s));
}

function strokesEqual(a: Stroke[], b: Stroke[]): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Apply eraser: remove touched ink and never keep white eraser strokes. */
export function applyEraserToStrokes(strokes: Stroke[], eraser: Stroke): Stroke[] {
  const out: Stroke[] = [];

  for (const stroke of strokes) {
    if (isEraserArtifact(stroke)) continue;
    if (!eraserIntersectsStroke(eraser, stroke)) {
      out.push(stroke);
      continue;
    }

    const fragments = splitStrokeByEraser(stroke, eraser);
    out.push(...fragments);
  }

  const cleaned = sanitizeDrawableStrokes(out);
  return strokesEqual(strokes, cleaned) ? strokes : cleaned;
}
