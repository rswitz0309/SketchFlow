import { CANVAS_BG, CANVAS_H, CANVAS_W, type Stroke } from '../types';
import type { Bounds } from './diffStrokes';
import { rasterizeSvgToPng } from './rasterize';
import { strokesToInnerSvg } from './serializeSvg';

const CROP_PAD = 24;
const CROP_MAX = 256;

function expandBounds(bounds: Bounds, pad = CROP_PAD): Bounds {
  const x = Math.max(0, bounds.x - pad);
  const y = Math.max(0, bounds.y - pad);
  const x2 = Math.min(CANVAS_W, bounds.x + bounds.w + pad);
  const y2 = Math.min(CANVAS_H, bounds.y + bounds.h + pad);
  return { x, y, w: x2 - x, h: y2 - y };
}

function regionSvg(strokes: Stroke[], bounds: Bounds): string {
  const b = expandBounds(bounds);
  const inner = strokesToInnerSvg(strokes);
  const aspect = b.w / Math.max(b.h, 1);
  let outW = CROP_MAX;
  let outH = CROP_MAX;
  if (aspect > 1) {
    outH = Math.round(CROP_MAX / aspect);
  } else {
    outW = Math.round(CROP_MAX * aspect);
  }
  outW = Math.max(outW, 64);
  outH = Math.max(outH, 64);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}" width="${outW}" height="${outH}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${CANVAS_BG}" />${inner}</svg>`;
}

export async function renderComponentCrop(
  strokes: Stroke[],
  bounds: Bounds,
): Promise<string | null> {
  if (strokes.length === 0) return null;
  try {
    return await rasterizeSvgToPng(regionSvg(strokes, bounds), CROP_MAX, CROP_MAX);
  } catch {
    return null;
  }
}

export async function renderComponentPairCrops(
  beforeStrokes: Stroke[] | undefined,
  afterStrokes: Stroke[] | undefined,
  beforeBounds: Bounds | undefined,
  afterBounds: Bounds,
): Promise<{ before: string | null; after: string | null }> {
  const after =
    afterStrokes && afterStrokes.length > 0
      ? await renderComponentCrop(afterStrokes, afterBounds)
      : null;
  const before =
    beforeStrokes && beforeStrokes.length > 0 && beforeBounds
      ? await renderComponentCrop(beforeStrokes, beforeBounds)
      : null;
  return { before, after };
}
