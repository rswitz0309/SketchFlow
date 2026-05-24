import type { DiffChange } from './diffStrokes';

/** Stable hash of detected changes — invalidates label cache when geometry/kinds shift. */
export function fingerprintDiff(changes: DiffChange[]): string {
  const parts = [...changes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => {
      const b = c.bounds;
      const bb = c.beforeBounds;
      const rb = `${Math.round(b.x / 8)}:${Math.round(b.y / 8)}:${Math.round(b.w / 8)}:${Math.round(b.h / 8)}`;
      const rbb = bb
        ? `${Math.round(bb.x / 8)}:${Math.round(bb.y / 8)}:${Math.round(bb.w / 8)}:${Math.round(bb.h / 8)}`
        : '';
      return `${c.id}|${c.kind}|${c.componentLabel}|${rb}|${rbb}`;
    });
  return parts.join(';;');
}
