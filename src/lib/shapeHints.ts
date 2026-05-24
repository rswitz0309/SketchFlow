import type { Stroke } from '../types';
import type { Bounds } from './diffStrokes';

const GENERIC_LABELS =
  /^(object|shape|element|detail|item|thing|drawing|sketch|mark|blob|random|unknown|component|group|area|region)$/i;

export function isGenericLabel(label: string): boolean {
  const t = label.trim();
  if (!t || t.length < 2) return true;
  if (GENERIC_LABELS.test(t)) return true;
  if (/^(left|right|center|top|bottom|middle)\s+(object|shape)$/i.test(t)) return true;
  if (/^visual\s+element/i.test(t)) return true;
  return false;
}

/** Geometry-based name suggestion before AI (e.g. elongated strokes → leg). */
export function inferShapeHint(strokes: Stroke[], bounds: Bounds): string | null {
  if (strokes.length === 0) return null;

  const aspect = bounds.w / Math.max(bounds.h, 1);
  const tall = bounds.h > 70;
  const wide = bounds.w > 90;
  const compact = bounds.w < 120 && bounds.h < 120;

  const totalPoints = strokes.reduce((n, s) => n + s.points.length, 0);
  const avgSize = strokes.reduce((n, s) => n + s.size, 0) / strokes.length;

  if (aspect < 0.45 && tall) {
    return bounds.y + bounds.h > 650 ? 'leg or foot' : 'leg or arm';
  }
  if (aspect > 2.2 && wide) {
    return 'arm, horizon line, or wide stroke';
  }
  if (compact && totalPoints > 12 && avgSize < 10) {
    return 'face or small detail';
  }
  if (aspect > 0.75 && aspect < 1.35 && bounds.w > 100 && bounds.h > 100) {
    return 'torso or main body';
  }
  if (strokes.length === 1 && totalPoints < 8) {
    return 'single stroke';
  }
  return null;
}

export function sanitizeAiLabel(
  raw: string | undefined,
  fallback: string,
): string {
  const candidate = raw?.trim();
  if (candidate && !isGenericLabel(candidate)) return candidate;
  if (!isGenericLabel(fallback)) return fallback;
  return fallback;
}
