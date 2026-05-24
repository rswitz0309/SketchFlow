import type { Stroke } from '../types';
import { strokesToInnerSvg } from './serializeSvg';
import { parseStrokesFromSvg } from './serializeSvg';
import { diffSvgComponents } from './diffComponents';

export type ChangeKind = 'add' | 'rem' | 'mov' | 'sty';

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiffChange {
  id: string;
  kind: ChangeKind;
  summary: string;
  detail: string;
  bounds: Bounds;
  beforeBounds?: Bounds;
  /** Unique highlight color for this change (not shared by kind). */
  color: string;
  colorFill: string;
  componentLabel: string;
  aiDescription?: string;
  strokeCount?: number;
  beforeStrokeCount?: number;
  /** Strokes in the after-state component (add/mov/sty). */
  memberStrokes?: Stroke[];
  /** Strokes in the before-state component (rem/mov/sty). */
  beforeMemberStrokes?: Stroke[];
}

export interface DiffResult {
  changes: DiffChange[];
  unchangedCount: number;
  beforeStrokes: Stroke[];
  afterStrokes: Stroke[];
}

/** Component-level diff (spatial clusters, not individual strokes). */
export function diffSvg(beforeSvg: string, afterSvg: string): DiffResult {
  return diffSvgComponents(beforeSvg, afterSvg);
}

export function buildPanelSvg(strokes: Stroke[]): string {
  return strokesToInnerSvg(strokes);
}

export function buildDiffOverlaySvg(
  result: DiffResult,
  opts: {
    selectedId: string | null;
    legend: Record<ChangeKind, boolean>;
  },
): string {
  const visible = result.changes.filter((c) => opts.legend[c.kind]);
  const base = strokesToInnerSvg(
    result.afterStrokes.length > 0 ? result.afterStrokes : result.beforeStrokes,
  );
  const overlays = visible.map((c) => {
    const selected = c.id === opts.selectedId;
    const sw = selected ? 3 : 1.5;
    const dash = c.kind === 'rem' ? ' stroke-dasharray="6 4"' : '';
    const b = c.bounds;
    return `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" fill="${c.colorFill}" stroke="${c.color}" stroke-width="${sw}"${dash} rx="4" />`;
  });
  return base + overlays.join('');
}

export { parseStrokesFromSvg };
