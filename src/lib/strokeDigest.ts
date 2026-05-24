import type { Stroke } from '../types';
import { isEraserArtifact } from './strokeErase';

/** Stable digest for dirty-checking (moves change points, not stroke count). */
export function strokesFingerprint(strokes: Stroke[]): string {
  return JSON.stringify(
    strokes.filter((s) => !isEraserArtifact(s)).map((s) => ({
      tool: s.tool,
      color: s.color,
      size: s.size,
      points: s.points,
    })),
  );
}
