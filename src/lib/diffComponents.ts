import type { Stroke } from '../types';
import { CANVAS_H, CANVAS_W } from '../types';
import type { Bounds, ChangeKind, DiffChange, DiffResult } from './diffStrokes';
import { parseStrokesFromSvg } from './serializeSvg';

/** Merge strokes that visually read as one object (touching / nearly touching). */
const MERGE_GAP = 22;
/** Max centroid drift before we call it a move (not a tweak). */
const MOVE_THRESHOLD = 24;
/** Max match distance — tighter = fewer false pairings across the canvas. */
const COMPONENT_MATCH_DIST = 92;
/** Min IoU to consider two clusters the same object when centroids are close. */
const MIN_MATCH_IOU = 0.12;

const CHANGE_PALETTE = [
  '#e11d48',
  '#2563eb',
  '#0d9488',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#4f46e5',
  '#be123c',
  '#0369a1',
];

export function changeColorAt(index: number): { stroke: string; fill: string } {
  const stroke = CHANGE_PALETTE[index % CHANGE_PALETTE.length];
  const r = parseInt(stroke.slice(1, 3), 16);
  const g = parseInt(stroke.slice(3, 5), 16);
  const b = parseInt(stroke.slice(5, 7), 16);
  return { stroke, fill: `rgba(${r}, ${g}, ${b}, 0.18)` };
}

interface Cluster {
  strokeIndices: number[];
  bounds: Bounds;
}

function strokeBounds(s: Stroke, pad = 8): Bounds {
  if (s.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
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
  const half = s.size / 2 + pad;
  return {
    x: minX - half,
    y: minY - half,
    w: maxX - minX + half * 2,
    h: maxY - minY + half * 2,
  };
}

function mergeBounds(a: Bounds, b: Bounds): Bounds {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function boxesNear(a: Bounds, b: Bounds, gap: number): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x <= bx2 + gap && bx2 >= a.x - gap && a.y <= by2 + gap && by2 >= a.y - gap;
}

function boundsIoU(a: Bounds, b: Bounds): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return inter / Math.max(union, 1);
}

function clusterCentroid(bounds: Bounds): [number, number] {
  return [bounds.x + bounds.w / 2, bounds.y + bounds.h / 2];
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function parseHex(color: string): [number, number, number] | null {
  if (!color.startsWith('#') || color.length < 7) return null;
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

/** Strokes that look like the same ink can merge; different hues stay separate objects. */
function colorsSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return false;
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]) < 72;
}

function strokeInkColor(s: Stroke): string {
  return s.tool === 'eraser' ? '__eraser__' : s.color;
}

function regionLabel(bounds: Bounds): string {
  const [cx, cy] = clusterCentroid(bounds);
  const h =
    cx < CANVAS_W * 0.33 ? 'left' : cx > CANVAS_W * 0.66 ? 'right' : 'center';
  const v =
    cy < CANVAS_H * 0.33 ? 'top' : cy > CANVAS_H * 0.66 ? 'bottom' : 'middle';
  if (v === 'middle' && h === 'center') return 'center';
  if (v === 'middle') return h;
  if (h === 'center') return v;
  return `${v} ${h}`;
}

function dominantColor(strokes: Stroke[]): string {
  const counts = new Map<string, number>();
  for (const s of strokes) {
    if (s.tool === 'eraser') continue;
    counts.set(s.color, (counts.get(s.color) ?? 0) + s.points.length);
  }
  let best = '#0b1220';
  let bestN = 0;
  for (const [c, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = c;
    }
  }
  return best;
}

function avgSize(strokes: Stroke[]): number {
  if (strokes.length === 0) return 0;
  return strokes.reduce((s, st) => s + st.size, 0) / strokes.length;
}

function boundsArea(b: Bounds): number {
  return b.w * b.h;
}

function areaRatio(a: Bounds, b: Bounds): number {
  const aa = boundsArea(a);
  const ab = boundsArea(b);
  return Math.abs(aa - ab) / Math.max(aa, ab, 1);
}

/**
 * Group strokes into visual objects: one stroke stays alone unless it
 * nearly touches another stroke of similar color (reads as one shape).
 */
function clusterStrokes(strokes: Stroke[]): Cluster[] {
  const n = strokes.length;
  if (n === 0) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(i: number, j: number) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[rj] = ri;
  }

  const bounds = strokes.map((s) => strokeBounds(s));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!boxesNear(bounds[i], bounds[j], MERGE_GAP)) continue;
      const ci = strokeInkColor(strokes[i]);
      const cj = strokeInkColor(strokes[j]);
      if (ci === '__eraser__' || cj === '__eraser__') {
        union(i, j);
        continue;
      }
      if (colorsSimilar(ci, cj)) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const g = groups.get(root) ?? [];
    g.push(i);
    groups.set(root, g);
  }

  return [...groups.values()].map((strokeIndices) => {
    let merged = bounds[strokeIndices[0]];
    for (let k = 1; k < strokeIndices.length; k++) {
      merged = mergeBounds(merged, bounds[strokeIndices[k]]);
    }
    return { strokeIndices, bounds: merged };
  });
}

function clusterMatchScore(
  beforeStrokes: Stroke[],
  afterStrokes: Stroke[],
  before: Cluster,
  after: Cluster,
): number {
  const iou = boundsIoU(before.bounds, after.bounds);
  const cd = dist(clusterCentroid(before.bounds), clusterCentroid(after.bounds));
  if (iou < MIN_MATCH_IOU && cd > COMPONENT_MATCH_DIST * 0.65) return Infinity;

  const beforeInk = dominantColor(
    before.strokeIndices.map((i) => beforeStrokes[i]),
  );
  const afterInk = dominantColor(
    after.strokeIndices.map((i) => afterStrokes[i]),
  );
  if (!colorsSimilar(beforeInk, afterInk) && iou < 0.22) return Infinity;

  const areaDelta = areaRatio(before.bounds, after.bounds);
  const strokeDelta =
    Math.abs(before.strokeIndices.length - after.strokeIndices.length) /
    Math.max(before.strokeIndices.length, after.strokeIndices.length, 1);
  return cd * (1.15 - iou * 0.65) + areaDelta * 72 + strokeDelta * 28;
}

function kindLabel(kind: ChangeKind): string {
  switch (kind) {
    case 'add':
      return 'added';
    case 'rem':
      return 'removed';
    case 'mov':
      return 'moved';
    case 'sty':
      return 'restyled';
  }
}

function objectSizeLabel(strokeCount: number): string {
  if (strokeCount <= 1) return 'object';
  if (strokeCount <= 3) return 'detail';
  return 'shape group';
}

function buildComponentSummary(
  kind: ChangeKind,
  region: string,
  strokeCount: number,
): string {
  return `${kindLabel(kind)} ${objectSizeLabel(strokeCount)} · ${region}`;
}

function buildComponentDetail(
  kind: ChangeKind,
  strokes: Stroke[],
  beforeStrokes?: Stroke[],
  beforeBounds?: Bounds,
  afterBounds?: Bounds,
): string {
  const color = dominantColor(strokes);
  if (kind === 'add') {
    return `${strokes.length} stroke${strokes.length === 1 ? '' : 's'} · ${color}`;
  }
  if (kind === 'rem' && beforeStrokes) {
    return `was ${dominantColor(beforeStrokes)} · ${beforeStrokes.length} stroke${beforeStrokes.length === 1 ? '' : 's'}`;
  }
  if (kind === 'mov' && beforeStrokes && beforeBounds && afterBounds) {
    const [bx, by] = clusterCentroid(beforeBounds);
    const [ax, ay] = clusterCentroid(afterBounds);
    return `${dominantColor(strokes)} · (${Math.round(bx)}, ${Math.round(by)}) → (${Math.round(ax)}, ${Math.round(ay)})`;
  }
  if (kind === 'sty' && beforeStrokes && beforeBounds && afterBounds) {
    const parts: string[] = [];
    const bc = dominantColor(beforeStrokes);
    const ac = dominantColor(strokes);
    if (bc !== ac) parts.push(`${bc} → ${ac}`);
    const bs = avgSize(beforeStrokes);
    const as = avgSize(strokes);
    if (Math.abs(bs - as) > 1) parts.push(`weight ${Math.round(bs)} → ${Math.round(as)}`);
    const ar = areaRatio(beforeBounds, afterBounds);
    if (ar > 0.18) parts.push(`size ${ar >= 0 ? '+' : ''}${Math.round(ar * 100)}%`);
    return parts.length > 0 ? parts.join(' · ') : `${ac} · refined shape`;
  }
  return `${strokes.length} stroke${strokes.length === 1 ? '' : 's'}`;
}

function detectChangeKind(
  beforeMemberStrokes: Stroke[],
  afterMemberStrokes: Stroke[],
  bc: Cluster,
  ac: Cluster,
): ChangeKind | null {
  const moved = dist(clusterCentroid(bc.bounds), clusterCentroid(ac.bounds)) > MOVE_THRESHOLD;
  const colorChanged =
    dominantColor(beforeMemberStrokes) !== dominantColor(afterMemberStrokes);
  const weightChanged =
    Math.abs(avgSize(beforeMemberStrokes) - avgSize(afterMemberStrokes)) > 1.5;
  const sizeChanged = areaRatio(bc.bounds, ac.bounds) > 0.2;
  const styled = colorChanged || weightChanged || sizeChanged;

  if (moved) return 'mov';
  if (styled) return 'sty';
  return null;
}

export function diffComponents(before: Stroke[], after: Stroke[]): DiffResult {
  const beforeClusters = clusterStrokes(before);
  const afterClusters = clusterStrokes(after);

  const pairs: { bi: number; ai: number; score: number }[] = [];

  for (let bi = 0; bi < beforeClusters.length; bi++) {
    for (let ai = 0; ai < afterClusters.length; ai++) {
      const score = clusterMatchScore(
        before,
        after,
        beforeClusters[bi],
        afterClusters[ai],
      );
      if (score < COMPONENT_MATCH_DIST) {
        pairs.push({ bi, ai, score });
      }
    }
  }

  pairs.sort((a, b) => a.score - b.score);
  const matchedBefore = new Set<number>();
  const matchedAfter = new Set<number>();
  const finalPairs: { bi: number; ai: number }[] = [];

  for (const p of pairs) {
    if (matchedBefore.has(p.bi) || matchedAfter.has(p.ai)) continue;
    matchedBefore.add(p.bi);
    matchedAfter.add(p.ai);
    finalPairs.push({ bi: p.bi, ai: p.ai });
  }

  const changes: DiffChange[] = [];
  let unchangedCount = 0;
  let colorIndex = 0;

  function pushChange(partial: Omit<DiffChange, 'color' | 'colorFill' | 'componentLabel'>) {
    const { stroke: color, fill: colorFill } = changeColorAt(colorIndex++);
    changes.push({
      ...partial,
      color,
      colorFill,
      componentLabel: regionLabel(partial.bounds),
    });
  }

  for (const { bi, ai } of finalPairs) {
    const bc = beforeClusters[bi];
    const ac = afterClusters[ai];
    const beforeMemberStrokes = bc.strokeIndices.map((i) => before[i]);
    const afterMemberStrokes = ac.strokeIndices.map((i) => after[i]);
    const kind = detectChangeKind(beforeMemberStrokes, afterMemberStrokes, bc, ac);
    const region = regionLabel(ac.bounds);
    const n = afterMemberStrokes.length;

    if (!kind) {
      unchangedCount++;
      continue;
    }

    pushChange({
      id: `comp-${kind}-${bi}-${ai}`,
      kind,
      summary: buildComponentSummary(kind, region, n),
      detail: buildComponentDetail(
        kind,
        afterMemberStrokes,
        beforeMemberStrokes,
        bc.bounds,
        ac.bounds,
      ),
      bounds: ac.bounds,
      beforeBounds: bc.bounds,
      strokeCount: n,
      beforeStrokeCount: beforeMemberStrokes.length,
      memberStrokes: afterMemberStrokes,
      beforeMemberStrokes,
    });
  }

  for (let bi = 0; bi < beforeClusters.length; bi++) {
    if (matchedBefore.has(bi)) continue;
    const bc = beforeClusters[bi];
    const strokes = bc.strokeIndices.map((i) => before[i]);
    const region = regionLabel(bc.bounds);
    pushChange({
      id: `comp-rem-${bi}`,
      kind: 'rem',
      summary: buildComponentSummary('rem', region, strokes.length),
      detail: buildComponentDetail('rem', strokes, strokes, bc.bounds),
      bounds: bc.bounds,
      strokeCount: strokes.length,
      beforeMemberStrokes: strokes,
    });
  }

  for (let ai = 0; ai < afterClusters.length; ai++) {
    if (matchedAfter.has(ai)) continue;
    const ac = afterClusters[ai];
    const strokes = ac.strokeIndices.map((i) => after[i]);
    const region = regionLabel(ac.bounds);
    pushChange({
      id: `comp-add-${ai}`,
      kind: 'add',
      summary: buildComponentSummary('add', region, strokes.length),
      detail: buildComponentDetail('add', strokes, undefined, undefined, ac.bounds),
      bounds: ac.bounds,
      strokeCount: strokes.length,
      memberStrokes: strokes,
    });
  }

  const order: ChangeKind[] = ['add', 'rem', 'mov', 'sty'];
  changes.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  return { changes, unchangedCount, beforeStrokes: before, afterStrokes: after };
}

export function diffSvgComponents(beforeSvg: string, afterSvg: string): DiffResult {
  const beforeStrokes = parseStrokesFromSvg(beforeSvg) ?? [];
  const afterStrokes = parseStrokesFromSvg(afterSvg) ?? [];
  return diffComponents(beforeStrokes, afterStrokes);
}
