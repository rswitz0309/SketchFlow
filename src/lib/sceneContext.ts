import { CANVAS_H, CANVAS_W, type Stroke } from '../types';
import type { Bounds } from './diffStrokes';

export type SceneKind = 'portrait' | 'figure' | 'landscape' | 'unknown';

const CANVAS_AREA = CANVAS_W * CANVAS_H;

function strokeBounds(s: Stroke, pad = 12): Bounds {
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

export function inferSceneKind(strokes: Stroke[]): SceneKind {
  if (strokes.length < 4) return 'unknown';

  const bounds = strokes.map(strokeBounds);
  let focal: Bounds | null = null;
  let maxArea = 0;

  for (const b of bounds) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const area = b.w * b.h;
    const inUpperCenter =
      cx > CANVAS_W * 0.25 &&
      cx < CANVAS_W * 0.75 &&
      cy < CANVAS_H * 0.55;
    if (inUpperCenter && area > maxArea && b.w > 80 && b.h > 80) {
      maxArea = area;
      focal = b;
    }
  }

  if (focal) {
    const aspect = focal.w / Math.max(focal.h, 1);
    if (aspect > 0.55 && aspect < 1.5) return 'portrait';
  }

  const tallStrokes = bounds.filter((b) => b.h > 120 && b.w < 90).length;
  if (tallStrokes >= 2) return 'figure';

  const spread =
    bounds.reduce((s, b) => s + b.w * b.h, 0) / Math.max(bounds.length, 1);
  if (spread > CANVAS_AREA * 0.08) return 'landscape';

  return 'unknown';
}

export function scenePromptForKind(kind: SceneKind): string | null {
  switch (kind) {
    case 'portrait':
      return (
        'Scene type: portrait / character focus. ' +
        'Name each change as part of that subject (features, hair, clothing, expression) using the full AFTER image for context. ' +
        'Small marks belong to the subject — describe them relative to what is already drawn, not as unrelated items.'
      );
    case 'figure':
      return (
        'Scene type: figure. ' +
        'Label changes as parts of the figure or scene (limbs, torso, pose, clothing) consistent with the full AFTER drawing.'
      );
    case 'landscape':
      return (
        'Scene type: wide composition. ' +
        'Label changes as parts of the environment or layout (horizon, buildings, trees, sky) using the AFTER image.'
      );
    default:
      return (
        'Use the full AFTER image to infer what each changed region belongs to. ' +
        'Prefer labels that describe a part of the existing drawing, not an unrelated category.'
      );
  }
}

/** Region overlapping the main focal area of a portrait-style layout. */
export function isSubjectFocalRegion(bounds: Bounds): boolean {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  return (
    cx > CANVAS_W * 0.2 &&
    cx < CANVAS_W * 0.8 &&
    cy < CANVAS_H * 0.62
  );
}

export function isSubpartScale(bounds: Bounds): boolean {
  const area = bounds.w * bounds.h;
  return area < CANVAS_AREA * 0.012 && bounds.w < 140 && bounds.h < 140;
}
