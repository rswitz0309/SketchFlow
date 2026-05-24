import { useRef, useState } from 'react';
import type { Stroke, Tool } from '../types';
import { CANVAS_BG, CANVAS_H, CANVAS_W } from '../types';
import { pointsToSmoothPath } from '../lib/serializeSvg';
import './DrawingSurface.css';

export interface DrawingSurfaceProps {
  strokes: Stroke[];
  tool: Tool;
  color: string;
  size: number;
  onStrokeComplete: (stroke: Stroke) => void;
}

interface StrokeRenderProps {
  stroke: Stroke;
}

function StrokePath({ stroke }: StrokeRenderProps) {
  const color = stroke.tool === 'eraser' ? CANVAS_BG : stroke.color;
  const width = stroke.tool === 'brush' ? stroke.size * 1.15 : stroke.size;
  const opacity = stroke.tool === 'brush' ? 0.85 : 1;

  if (stroke.points.length === 0) return null;
  if (stroke.points.length === 1) {
    const [x, y] = stroke.points[0];
    const r = Math.max(stroke.size / 2, 0.5);
    return <circle cx={x} cy={y} r={r} fill={color} opacity={opacity} />;
  }
  const d = pointsToSmoothPath(stroke.points);
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

export default function DrawingSurface(props: DrawingSurfaceProps) {
  const { strokes, tool, color, size, onStrokeComplete } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<[number, number][] | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  function toLocal(e: React.PointerEvent<SVGSVGElement>): [number, number] | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const loc = pt.matrixTransform(inv);
    return [loc.x, loc.y];
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const loc = toLocal(e);
    if (!loc) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* setPointerCapture can throw for synthetic/mock pointers; ignore */
    }
    pointsRef.current = [loc];
    setRenderTick((t) => t + 1);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointsRef.current) return;
    const loc = toLocal(e);
    if (!loc) return;
    const last = pointsRef.current[pointsRef.current.length - 1];
    const dx = loc[0] - last[0];
    const dy = loc[1] - last[1];
    if (dx * dx + dy * dy < 2.25) return;
    pointsRef.current.push(loc);
    setRenderTick((t) => t + 1);
  }

  function finishStroke() {
    const pts = pointsRef.current;
    pointsRef.current = null;
    if (!pts || pts.length === 0) {
      setRenderTick((t) => t + 1);
      return;
    }
    const stroke: Stroke = {
      tool,
      color,
      size,
      points: pts,
    };
    onStrokeComplete(stroke);
    setRenderTick((t) => t + 1);
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    finishStroke();
  }

  function handlePointerLeave() {
    if (pointsRef.current) finishStroke();
  }

  const inProgressStroke: Stroke | null = pointsRef.current
    ? { tool, color, size, points: pointsRef.current }
    : null;

  return (
    <div className="sf-drawing-surface">
      <div className="sf-drawing-surface__frame">
        <svg
          ref={svgRef}
          className="sf-drawing-surface__svg"
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          data-render-tick={renderTick}
        >
          <rect width={CANVAS_W} height={CANVAS_H} fill={CANVAS_BG} />
          {strokes.map((s, i) => (
            <StrokePath key={i} stroke={s} />
          ))}
          {inProgressStroke && <StrokePath stroke={inProgressStroke} />}
        </svg>
      </div>
    </div>
  );
}
