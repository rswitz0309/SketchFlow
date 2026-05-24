import { CANVAS_BG, CANVAS_H, CANVAS_W, type Stroke } from '../types';
import { sanitizeDrawableStrokes } from './strokeErase';

function strokeAttrs(s: Stroke): string {
  const color = s.tool === 'eraser' ? CANVAS_BG : s.color;
  const opacity = s.tool === 'brush' ? 0.85 : 1;
  const width = s.tool === 'brush' ? s.size * 1.15 : s.size;
  return `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
}

function strokeToPath(s: Stroke): string {
  if (s.points.length === 0) return '';
  if (s.points.length === 1) {
    const [x, y] = s.points[0];
    const r = Math.max(s.size / 2, 0.5);
    const color = s.tool === 'eraser' ? CANVAS_BG : s.color;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}" />`;
  }
  const d = pointsToSmoothPath(s.points);
  return `<path d="${d}" ${strokeAttrs(s)} />`;
}

export function pointsToSmoothPath(points: [number, number][]): string {
  if (points.length < 2) return '';
  const parts: string[] = [];
  parts.push(`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`);
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    parts.push(`Q ${x0.toFixed(2)} ${y0.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${last[0].toFixed(2)} ${last[1].toFixed(2)}`);
  return parts.join(' ');
}

function escapeForCdata(s: string): string {
  return s.replace(/]]>/g, ']]]]><![CDATA[>');
}

function drawableStrokes(strokes: Stroke[]): Stroke[] {
  return sanitizeDrawableStrokes(strokes);
}

export function strokesToSvg(
  strokes: Stroke[],
  opts: { width?: number; height?: number; includeBg?: boolean } = {},
): string {
  const width = opts.width ?? CANVAS_W;
  const height = opts.height ?? CANVAS_H;
  const includeBg = opts.includeBg ?? true;
  const ink = drawableStrokes(strokes);
  const bg = includeBg
    ? `<rect width="100%" height="100%" fill="${CANVAS_BG}" />`
    : '';
  const body = ink.map(strokeToPath).join('');
  const meta = `<metadata id="sf-strokes"><![CDATA[${escapeForCdata(
    JSON.stringify(ink),
  )}]]></metadata>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="${width}" height="${height}">${meta}${bg}${body}</svg>`;
}

export function strokesToInnerSvg(strokes: Stroke[]): string {
  return drawableStrokes(strokes).map(strokeToPath).join('');
}

export function parseStrokesFromSvg(svgString: string): Stroke[] | null {
  const match = svgString.match(
    /<metadata id="sf-strokes">\s*<!\[CDATA\[([\s\S]*?)]]>\s*<\/metadata>/,
  );
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    if (!Array.isArray(data)) return null;
    return sanitizeDrawableStrokes(data as Stroke[]);
  } catch {
    return null;
  }
}
