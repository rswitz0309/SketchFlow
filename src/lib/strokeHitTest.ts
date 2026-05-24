import type { Stroke } from '../types';
import { isEraserArtifact } from './strokeErase';

const HIT_PAD = 6;

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function strokeHitRadius(stroke: Stroke): number {
  const width = stroke.tool === 'brush' ? stroke.size * 1.15 : stroke.size;
  return width / 2 + HIT_PAD;
}

export function strokeHitsPoint(
  stroke: Stroke,
  point: [number, number],
  maxDist?: number,
): boolean {
  const [px, py] = point;
  const radius = maxDist ?? strokeHitRadius(stroke);
  const radiusSq = radius * radius;

  if (stroke.points.length === 0) return false;
  if (stroke.points.length === 1) {
    const [x, y] = stroke.points[0];
    return distSq(px, py, x, y) <= radiusSq;
  }

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const [ax, ay] = stroke.points[i];
    const [bx, by] = stroke.points[i + 1];
    if (distPointToSegment(px, py, ax, ay, bx, by) <= radius) return true;
  }
  return false;
}

/** Top-most stroke under the point (last drawn wins). */
export function findStrokeAtPoint(strokes: Stroke[], point: [number, number]): number | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (isEraserArtifact(strokes[i])) continue;
    if (strokeHitsPoint(strokes[i], point)) return i;
  }
  return null;
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
    const steps = Math.max(1, Math.ceil(len / 5));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  return out;
}

/** True when an eraser stroke overlaps drawable ink. */
export function eraserIntersectsStroke(eraser: Stroke, target: Stroke): boolean {
  if (target.tool === 'eraser') return false;
  const threshold = strokeHitRadius(eraser) + strokeHitRadius(target);
  for (const pt of sampleEraserPoints(eraser)) {
    if (strokeHitsPoint(target, pt, threshold)) return true;
  }
  return false;
}

/** Indices of strokes removed by an eraser pass (top to bottom order). */
export function findStrokesErasedBy(strokes: Stroke[], eraser: Stroke): number[] {
  const hit: number[] = [];
  for (let i = 0; i < strokes.length; i++) {
    if (strokes[i].tool === 'eraser') continue;
    if (eraserIntersectsStroke(eraser, strokes[i])) hit.push(i);
  }
  return hit;
}

export function translateStroke(stroke: Stroke, dx: number, dy: number): Stroke {
  if (dx === 0 && dy === 0) return stroke;
  return {
    ...stroke,
    points: stroke.points.map(([x, y]) => [x + dx, y + dy]),
  };
}
