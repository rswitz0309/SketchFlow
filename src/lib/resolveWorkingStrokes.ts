import type { Checkpoint, Stroke } from '../types';
import { parseStrokesFromSvg } from './serializeSvg';
import { sanitizeDrawableStrokes } from './strokeErase';

/**
 * Prefer non-empty autosave (unsaved work), then the latest checkpoint SVG,
 * otherwise an empty canvas. Empty autosave arrays are ignored so a wiped
 * localStorage entry does not hide saved checkpoints.
 */
export function resolveWorkingStrokes(
  autosaved: Stroke[] | null,
  latestCheckpoint: Checkpoint | null,
): Stroke[] {
  if (autosaved && autosaved.length > 0) return sanitizeDrawableStrokes(autosaved);
  if (latestCheckpoint?.svgData) {
    const fromCheckpoint = parseStrokesFromSvg(latestCheckpoint.svgData);
    if (fromCheckpoint && fromCheckpoint.length > 0) return fromCheckpoint;
  }
  return [];
}
