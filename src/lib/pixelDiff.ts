import { CANVAS_BG, CANVAS_H, CANVAS_W } from '../types';
import type { Bounds } from './diffStrokes';
import { rasterizeSvgToPng } from './rasterize';

const ANALYSIS_W = 400;
const ANALYSIS_H = 250;
const SCALE_X = CANVAS_W / ANALYSIS_W;
const SCALE_Y = CANVAS_H / ANALYSIS_H;
const DIFF_THRESHOLD = 42;
const MIN_REGION_PX = 28;

function parseBg(): [number, number, number] {
  const hex = CANVAS_BG.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function inkScore(r: number, g: number, b: number, bg: [number, number, number]): number {
  return Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
}

async function loadRgba(svg: string): Promise<Uint8ClampedArray> {
  const dataUrl = await rasterizeSvgToPng(svg, ANALYSIS_W, ANALYSIS_H);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load raster'));
    el.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = ANALYSIS_W;
  canvas.height = ANALYSIS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  ctx.drawImage(img, 0, 0, ANALYSIS_W, ANALYSIS_H);
  return ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H).data;
}

/** Merge neighboring diff pixels so limb-like strokes form one region. */
function dilateMask(mask: Uint8Array, w: number, h: number): void {
  const copy = mask.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!copy[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) mask[ny * w + nx] = 1;
        }
      }
    }
  }
}

function toCanvasBounds(x: number, y: number, w: number, h: number): Bounds {
  return {
    x: x * SCALE_X,
    y: y * SCALE_Y,
    w: Math.max(w * SCALE_X, 8),
    h: Math.max(h * SCALE_Y, 8),
  };
}

/** Connected components on a before/after pixel diff mask (computer-vision style). */
export async function detectChangedPixelRegions(
  beforeSvg: string,
  afterSvg: string,
): Promise<Bounds[]> {
  const bg = parseBg();
  const [beforePx, afterPx] = await Promise.all([
    loadRgba(beforeSvg),
    loadRgba(afterSvg),
  ]);

  const n = ANALYSIS_W * ANALYSIS_H;
  const mask = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const bInk = inkScore(beforePx[o], beforePx[o + 1], beforePx[o + 2], bg);
    const aInk = inkScore(afterPx[o], afterPx[o + 1], afterPx[o + 2], bg);
    const bOn = bInk > 28;
    const aOn = aInk > 28;
    let changed = bOn !== aOn;
    if (bOn && aOn) {
      changed =
        Math.abs(beforePx[o] - afterPx[o]) +
          Math.abs(beforePx[o + 1] - afterPx[o + 1]) +
          Math.abs(beforePx[o + 2] - afterPx[o + 2]) >
        DIFF_THRESHOLD;
    }
    mask[i] = changed ? 1 : 0;
  }

  dilateMask(mask, ANALYSIS_W, ANALYSIS_H);

  const visited = new Uint8Array(n);
  const regions: Bounds[] = [];

  function idx(x: number, y: number): number {
    return y * ANALYSIS_W + x;
  }

  for (let y = 0; y < ANALYSIS_H; y++) {
    for (let x = 0; x < ANALYSIS_W; x++) {
      const start = idx(x, y);
      if (!mask[start] || visited[start]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      const stack: [number, number][] = [[x, y]];
      visited[start] = 1;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        count++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const neighbors: [number, number][] = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= ANALYSIS_W || ny >= ANALYSIS_H) continue;
          const ni = idx(nx, ny);
          if (!mask[ni] || visited[ni]) continue;
          visited[ni] = 1;
          stack.push([nx, ny]);
        }
      }

      if (count < MIN_REGION_PX) continue;
      regions.push(toCanvasBounds(minX, minY, maxX - minX + 1, maxY - minY + 1));
    }
  }

  return mergeNearbyRegions(regions);
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

function mergeNearbyRegions(regions: Bounds[]): Bounds[] {
  if (regions.length <= 1) return regions;
  const gap = 36;
  const parent = regions.map((_, i) => i);
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

  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i];
      const b = regions[j];
      const near =
        a.x <= b.x + b.w + gap &&
        b.x <= a.x + a.w + gap &&
        a.y <= b.y + b.h + gap &&
        b.y <= a.y + a.h + gap;
      if (near) union(i, j);
    }
  }

  const groups = new Map<number, Bounds[]>();
  for (let i = 0; i < regions.length; i++) {
    const g = groups.get(find(i)) ?? [];
    g.push(regions[i]);
    groups.set(find(i), g);
  }

  return [...groups.values()].map((group) => {
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const b of group) {
      x1 = Math.min(x1, b.x);
      y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.w);
      y2 = Math.max(y2, b.y + b.h);
    }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  });
}

export function overlapsPixelRegions(changeBounds: Bounds, regions: Bounds[]): boolean {
  return regions.some((r) => boundsIoU(changeBounds, r) >= 0.04);
}
