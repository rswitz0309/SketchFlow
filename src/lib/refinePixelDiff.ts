import type { Stroke } from '../types';
import type { Bounds, DiffChange, DiffResult } from './diffStrokes';
import { changeColorAt } from './diffComponents';
import { detectChangedPixelRegions, overlapsPixelRegions } from './pixelDiff';

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

function regionLabel(bounds: Bounds): string {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const h = cx < 533 ? 'left' : cx > 1066 ? 'right' : 'center';
  const v = cy < 333 ? 'top' : cy > 666 ? 'bottom' : 'middle';
  if (v === 'middle' && h === 'center') return 'center';
  if (v === 'middle') return h;
  if (h === 'center') return v;
  return `${v} ${h}`;
}

function strokesInRegion(strokes: Stroke[], region: Bounds): Stroke[] {
  return strokes.filter((s) => boundsIoU(strokeBounds(s), region) >= 0.08);
}

function snapBoundsToRegion(bounds: Bounds, region: Bounds): Bounds {
  const x1 = Math.max(bounds.x, region.x);
  const y1 = Math.max(bounds.y, region.y);
  const x2 = Math.min(bounds.x + bounds.w, region.x + region.w);
  const y2 = Math.min(bounds.y + bounds.h, region.y + region.h);
  if (x2 > x1 && y2 > y1) return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  return bounds;
}

export async function diffSvgWithPixelVision(
  beforeSvg: string,
  afterSvg: string,
  base: DiffResult,
): Promise<DiffResult> {
  try {
    const regions = await detectChangedPixelRegions(beforeSvg, afterSvg);
    if (regions.length === 0) return base;
    return refineWithPixelRegions(base, regions);
  } catch (err) {
    console.warn('Pixel vision refine skipped:', err);
    return base;
  }
}

function refineWithPixelRegions(result: DiffResult, regions: Bounds[]): DiffResult {
  let colorIndex = result.changes.length;

  const kept = result.changes.filter((c) => {
    const probe = c.beforeBounds ?? c.bounds;
    return overlapsPixelRegions(probe, regions) || overlapsPixelRegions(c.bounds, regions);
  });

  const changes: DiffChange[] = kept.map((c) => {
    const region = regions.find(
      (r) =>
        boundsIoU(c.bounds, r) >= 0.04 ||
        (c.beforeBounds && boundsIoU(c.beforeBounds, r) >= 0.04),
    );
    if (!region) return c;
    const bounds = snapBoundsToRegion(c.bounds, region);
    const beforeBounds = c.beforeBounds
      ? snapBoundsToRegion(c.beforeBounds, region)
      : undefined;
    return { ...c, bounds, beforeBounds };
  });

  for (const region of regions) {
    const covered = changes.some(
      (c) =>
        boundsIoU(c.bounds, region) >= 0.12 ||
        (c.beforeBounds && boundsIoU(c.beforeBounds, region) >= 0.12),
    );
    if (covered) continue;

    const beforeHits = strokesInRegion(result.beforeStrokes, region);
    const afterHits = strokesInRegion(result.afterStrokes, region);
    if (beforeHits.length === 0 && afterHits.length === 0) continue;

    let kind: DiffChange['kind'];
    if (beforeHits.length === 0) kind = 'add';
    else if (afterHits.length === 0) kind = 'rem';
    else kind = 'sty';

    const { stroke: color, fill: colorFill } = changeColorAt(colorIndex++);
    const regionName = regionLabel(region);
    changes.push({
      id: `px-${kind}-${colorIndex}`,
      kind,
      summary: `${kind === 'add' ? 'added' : kind === 'rem' ? 'removed' : 'changed'} object · ${regionName}`,
      detail: 'Detected via canvas vision',
      bounds: region,
      beforeBounds: kind !== 'add' ? region : undefined,
      color,
      colorFill,
      componentLabel: regionName,
      memberStrokes: afterHits.length > 0 ? afterHits : undefined,
      beforeMemberStrokes: beforeHits.length > 0 ? beforeHits : undefined,
      strokeCount: afterHits.length,
      beforeStrokeCount: beforeHits.length,
    });
  }

  return { ...result, changes };
}
