import type { Stroke } from '../types';
import type { Bounds } from './diffStrokes';

const GENERIC_LABELS =
  /^(object|shape|element|detail|item|thing|drawing|sketch|mark|blob|random|unknown|component|group|area|region)$/i;

export function isGenericLabel(label: string): boolean {
  const t = label.trim();
  if (!t || t.length < 2) return true;
  if (GENERIC_LABELS.test(t)) return true;
  if (/^(left|right|center|top|bottom|middle)\s+(object|shape|region)$/i.test(t)) {
    return true;
  }
  if (/^visual\s+element/i.test(t)) return true;
  return false;
}

/** Neutral geometry-based hint (no assumed subject matter). */
export function inferShapeHint(strokes: Stroke[], bounds: Bounds): string | null {
  if (strokes.length === 0) return null;

  const aspect = bounds.w / Math.max(bounds.h, 1);
  const tall = bounds.h > 70;
  const wide = bounds.w > 90;
  const compact = bounds.w < 120 && bounds.h < 120;
  const totalPoints = strokes.reduce((n, s) => n + s.points.length, 0);

  if (aspect < 0.45 && tall) return 'elongated vertical form';
  if (aspect > 2.2 && wide) return 'elongated horizontal form';
  if (compact && totalPoints > 12) return 'compact stroke cluster';
  if (aspect > 0.75 && aspect < 1.35 && bounds.w > 100 && bounds.h > 100) {
    return 'large central mass';
  }
  if (strokes.length === 1 && totalPoints < 8) return 'single stroke';
  return null;
}
