import type { Stroke } from '../types';
import type { Bounds } from './diffStrokes';

export interface RigidMoveEstimate {
  isMove: boolean;
  dx: number;
  dy: number;
  confidence: number;
  displacement: number;
}

const RESAMPLE_COUNT = 16;
const SHAPE_MATCH_THRESHOLD = 16;
/** Max centroid drift to treat a stroke as unchanged (not moved). */
const UNCHANGED_DISPLACEMENT = 10;

export interface UnchangedStrokePairs {
  matchedBefore: Set<number>;
  matchedAfter: Set<number>;
  count: number;
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function parseHex(color: string): [number, number, number] | null {
  if (!color.startsWith('#') || color.length < 7) return null;
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

export function colorsSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return false;
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]) < 72;
}

export function strokeCentroid(stroke: Stroke): [number, number] {
  if (stroke.points.length === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of stroke.points) {
    sx += x;
    sy += y;
  }
  return [sx / stroke.points.length, sy / stroke.points.length];
}

function normalizePoints(
  points: [number, number][],
  center: [number, number],
): [number, number][] {
  return points.map(([x, y]) => [x - center[0], y - center[1]]);
}

function pathLength(points: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i]);
  }
  return len;
}

function pointAtFraction(points: [number, number][], t: number): [number, number] {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  const total = pathLength(points);
  if (total <= 0) return points[0];
  const target = total * Math.max(0, Math.min(1, t));
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (walked + seg >= target) {
      const u = seg > 0 ? (target - walked) / seg : 0;
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u,
      ];
    }
    walked += seg;
  }
  return points[points.length - 1];
}

function resampleNormalized(stroke: Stroke, samples = RESAMPLE_COUNT): [number, number][] {
  const center = strokeCentroid(stroke);
  const normalized = normalizePoints(stroke.points, center);
  if (normalized.length === 0) return [];
  if (normalized.length === 1) {
    return Array.from({ length: samples }, () => normalized[0]);
  }
  return Array.from({ length: samples }, (_, i) =>
    pointAtFraction(normalized, samples === 1 ? 0 : i / (samples - 1)),
  );
}

/** Average point distance after aligning stroke centroids and resampling paths. */
export function strokeShapeDistance(a: Stroke, b: Stroke): number {
  const ra = resampleNormalized(a);
  const rb = resampleNormalized(b);
  if (ra.length === 0 || rb.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < ra.length; i++) {
    sum += dist(ra[i], rb[i]);
  }
  return sum / ra.length;
}

function colorsCompatible(a: Stroke, b: Stroke): boolean {
  if (a.tool === 'eraser' || b.tool === 'eraser') return a.tool === b.tool;
  return colorsSimilar(a.color, b.color);
}

function displacementConsistency(
  displacements: [number, number][],
  dx: number,
  dy: number,
): number {
  if (displacements.length <= 1) return 1;
  const spreads = displacements.map(([vx, vy]) => dist([vx, vy], [dx, dy]));
  const avg = spreads.reduce((s, v) => s + v, 0) / spreads.length;
  return Math.max(0, 1 - avg / 48);
}

/**
 * Detect whether after strokes are rigid translations of before strokes
 * (same shape/ink, new position — as with the canvas move tool).
 */
export function estimateRigidMove(
  before: Stroke[],
  after: Stroke[],
  moveThreshold = 18,
): RigidMoveEstimate {
  if (before.length === 0 || after.length === 0) {
    return { isMove: false, dx: 0, dy: 0, confidence: 0, displacement: 0 };
  }

  const usedAfter = new Set<number>();
  const displacements: [number, number][] = [];

  for (const bs of before) {
    let bestAi = -1;
    let bestDist = Infinity;
    for (let ai = 0; ai < after.length; ai++) {
      if (usedAfter.has(ai)) continue;
      const as = after[ai];
      if (!colorsCompatible(bs, as)) continue;
      if (Math.abs(bs.size - as.size) > 5) continue;
      const sd = strokeShapeDistance(bs, as);
      if (sd < bestDist) {
        bestDist = sd;
        bestAi = ai;
      }
    }
    if (bestAi >= 0 && bestDist <= SHAPE_MATCH_THRESHOLD) {
      usedAfter.add(bestAi);
      const [bx, by] = strokeCentroid(bs);
      const [ax, ay] = strokeCentroid(after[bestAi]);
      displacements.push([ax - bx, ay - by]);
    }
  }

  if (displacements.length === 0) {
    return { isMove: false, dx: 0, dy: 0, confidence: 0, displacement: 0 };
  }

  const dx = median(displacements.map(([vx]) => vx));
  const dy = median(displacements.map(([, vy]) => vy));
  const displacement = Math.hypot(dx, dy);
  const consistency = displacementConsistency(displacements, dx, dy);
  const coverage =
    displacements.length / Math.max(before.length, after.length, 1);
  const confidence = coverage * 0.55 + consistency * 0.45;
  const isMove = displacement >= moveThreshold && confidence >= 0.42;

  return { isMove, dx, dy, confidence, displacement };
}

/** Same shape and ink at the same canvas position (within tolerance). */
export function strokeMatchesUnchanged(before: Stroke, after: Stroke): boolean {
  if (before.tool === 'eraser' || after.tool === 'eraser') {
    return (
      before.tool === after.tool &&
      strokeShapeDistance(before, after) <= SHAPE_MATCH_THRESHOLD &&
      dist(strokeCentroid(before), strokeCentroid(after)) <= UNCHANGED_DISPLACEMENT
    );
  }
  if (!colorsCompatible(before, after)) return false;
  if (Math.abs(before.size - after.size) > 5) return false;
  if (strokeShapeDistance(before, after) > SHAPE_MATCH_THRESHOLD) return false;
  return dist(strokeCentroid(before), strokeCentroid(after)) <= UNCHANGED_DISPLACEMENT;
}

/**
 * Pair strokes that are identical in shape and position across saves.
 * Excludes them from add/remove detection — e.g. strokes revealed when
 * another stroke on top is moved away.
 */
export function pairUnchangedStrokes(
  before: Stroke[],
  after: Stroke[],
): UnchangedStrokePairs {
  const matchedBefore = new Set<number>();
  const matchedAfter = new Set<number>();
  let count = 0;

  for (let ai = 0; ai < after.length; ai++) {
    if (matchedAfter.has(ai)) continue;
    let bestBi = -1;
    let bestShape = Infinity;
    for (let bi = 0; bi < before.length; bi++) {
      if (matchedBefore.has(bi)) continue;
      if (!strokeMatchesUnchanged(before[bi], after[ai])) continue;
      const sd = strokeShapeDistance(before[bi], after[ai]);
      if (sd < bestShape) {
        bestShape = sd;
        bestBi = bi;
      }
    }
    if (bestBi >= 0) {
      matchedBefore.add(bestBi);
      matchedAfter.add(ai);
      count++;
    }
  }

  return { matchedBefore, matchedAfter, count };
}

/** True when every drawable stroke in the cluster already existed before at the same spot. */
export function clusterUnchangedInBefore(
  memberStrokes: Stroke[],
  before: Stroke[],
  alreadyMatched?: Set<number>,
): boolean {
  const drawable = memberStrokes.filter((s) => s.tool !== 'eraser');
  if (drawable.length === 0) return false;

  const used = new Set(alreadyMatched ?? []);
  let matched = 0;
  for (const as of drawable) {
    for (let bi = 0; bi < before.length; bi++) {
      if (used.has(bi)) continue;
      if (strokeMatchesUnchanged(before[bi], as)) {
        used.add(bi);
        matched++;
        break;
      }
    }
  }
  return matched >= drawable.length;
}

export function formatMoveDetail(
  strokes: Stroke[],
  estimate: RigidMoveEstimate,
  dominantColor: (strokes: Stroke[]) => string,
  beforeBounds?: Bounds,
  afterBounds?: Bounds,
): string {
  const color = dominantColor(strokes);
  const px = Math.round(estimate.displacement);
  if (beforeBounds && afterBounds) {
    const bx = Math.round(beforeBounds.x + beforeBounds.w / 2);
    const by = Math.round(beforeBounds.y + beforeBounds.h / 2);
    const ax = Math.round(afterBounds.x + afterBounds.w / 2);
    const ay = Math.round(afterBounds.y + afterBounds.h / 2);
    return `${color} · ${px}px · (${bx}, ${by}) → (${ax}, ${ay})`;
  }
  if (px > 0) return `${color} · moved ${px}px`;
  return `${color} · repositioned`;
}
