import { useEffect, useRef, useState } from 'react';
import type { Stroke, Tool } from '../types';
import { CANVAS_BG, CANVAS_H, CANVAS_W } from '../types';
import { findStrokeAtPoint, translateStroke } from '../lib/strokeHitTest';
import { pointsToSmoothPath } from '../lib/serializeSvg';
import './DrawingSurface.css';

export interface DrawingSurfaceProps {
  strokes: Stroke[];
  tool: Tool;
  color: string;
  size: number;
  onStrokeComplete: (stroke: Stroke) => void;
  onMoveStrokes: (indices: number[], dx: number, dy: number) => void;
}

interface StrokeRenderProps {
  stroke: Stroke;
  highlighted?: boolean;
  dimmed?: boolean;
}

function StrokePath({ stroke, highlighted, dimmed }: StrokeRenderProps) {
  const color = stroke.tool === 'eraser' ? CANVAS_BG : stroke.color;
  const width = stroke.tool === 'brush' ? stroke.size * 1.15 : stroke.size;
  const opacity = dimmed ? 0.35 : stroke.tool === 'brush' ? 0.85 : 1;

  if (stroke.points.length === 0) return null;

  if (stroke.points.length === 1) {
    const [x, y] = stroke.points[0];
    const r = Math.max(stroke.size / 2, 0.5);
    return (
      <>
        {highlighted && (
          <circle cx={x} cy={y} r={r + 6} fill="rgba(37, 99, 235, 0.12)" stroke="#2563eb" strokeWidth={1.5} />
        )}
        <circle cx={x} cy={y} r={r} fill={color} opacity={opacity} />
      </>
    );
  }

  const d = pointsToSmoothPath(stroke.points);
  return (
    <>
      {highlighted && (
        <path
          d={d}
          fill="none"
          stroke="#2563eb"
          strokeWidth={width + 10}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.25}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    </>
  );
}

function isMultiSelectKey(e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): boolean {
  return e.shiftKey || e.metaKey || e.ctrlKey;
}

export default function DrawingSurface(props: DrawingSurfaceProps) {
  const { strokes, tool, color, size, onStrokeComplete, onMoveStrokes } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<[number, number][] | null>(null);
  const dragRef = useRef<{
    indices: number[];
    start: [number, number];
    offset: [number, number];
  } | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selectedSet = new Set(selectedIndices);

  function bumpRender() {
    setRenderTick((t) => t + 1);
  }

  useEffect(() => {
    if (tool !== 'select') {
      setSelectedIndices([]);
      setHoveredIndex(null);
      dragRef.current = null;
    }
  }, [tool]);

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

  function handleDrawPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const loc = toLocal(e);
    if (!loc) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointsRef.current = [loc];
    bumpRender();
  }

  function handleDrawPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointsRef.current) return;
    const loc = toLocal(e);
    if (!loc) return;
    const last = pointsRef.current[pointsRef.current.length - 1];
    const dx = loc[0] - last[0];
    const dy = loc[1] - last[1];
    if (dx * dx + dy * dy < 2.25) return;
    pointsRef.current.push(loc);
    bumpRender();
  }

  function finishStroke() {
    const pts = pointsRef.current;
    pointsRef.current = null;
    if (!pts || pts.length === 0) {
      bumpRender();
      return;
    }
    onStrokeComplete({ tool, color, size, points: pts });
    bumpRender();
  }

  function handleSelectPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const loc = toLocal(e);
    if (!loc) return;
    const hit = findStrokeAtPoint(strokes, loc);

    if (hit === null) {
      setSelectedIndices([]);
      setHoveredIndex(null);
      return;
    }

    let nextSelection: number[];
    if (isMultiSelectKey(e)) {
      if (selectedSet.has(hit)) {
        nextSelection = selectedIndices.filter((i) => i !== hit);
      } else {
        nextSelection = [...selectedIndices, hit];
      }
    } else if (selectedSet.has(hit)) {
      nextSelection = selectedIndices;
    } else {
      nextSelection = [hit];
    }

    setSelectedIndices(nextSelection);
    setHoveredIndex(hit);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (nextSelection.length > 0) {
      dragRef.current = { indices: nextSelection, start: loc, offset: [0, 0] };
    }
    bumpRender();
  }

  function handleSelectPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const loc = toLocal(e);
    if (!loc) return;

    if (dragRef.current) {
      dragRef.current = {
        ...dragRef.current,
        offset: [
          loc[0] - dragRef.current.start[0],
          loc[1] - dragRef.current.start[1],
        ],
      };
      bumpRender();
      return;
    }

    setHoveredIndex(findStrokeAtPoint(strokes, loc));
  }

  function finishSelect(e: React.PointerEvent<SVGSVGElement>) {
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }

    const drag = dragRef.current;
    dragRef.current = null;
    if (drag) {
      const [dx, dy] = drag.offset;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        onMoveStrokes(drag.indices, dx, dy);
      }
      bumpRender();
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'select') {
      handleSelectPointerDown(e);
      return;
    }
    handleDrawPointerDown(e);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'select') {
      handleSelectPointerMove(e);
      return;
    }
    handleDrawPointerMove(e);
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (tool === 'select') {
      finishSelect(e);
      return;
    }
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
    if (tool === 'select') {
      if (!dragRef.current) setHoveredIndex(null);
      return;
    }
    if (pointsRef.current) finishStroke();
  }

  const drag = dragRef.current;
  const dragOffset = drag?.offset ?? [0, 0];
  const dragSet = new Set(drag?.indices ?? []);
  const isDragging = drag !== null;
  const activeSet =
    tool === 'select'
      ? isDragging
        ? dragSet
        : selectedSet.size > 0
          ? selectedSet
          : hoveredIndex !== null
            ? new Set([hoveredIndex])
            : new Set<number>()
      : new Set<number>();

  const displayStrokes = isDragging
    ? strokes.map((stroke, i) =>
        dragSet.has(i) ? translateStroke(stroke, dragOffset[0], dragOffset[1]) : stroke,
      )
    : strokes;

  const inProgressStroke: Stroke | null =
    tool !== 'select' && pointsRef.current
      ? { tool, color, size, points: pointsRef.current }
      : null;

  const cursorClass =
    tool === 'select'
      ? isDragging
        ? 'sf-drawing-surface__svg--grabbing'
        : activeSet.size > 0 || hoveredIndex !== null
          ? 'sf-drawing-surface__svg--grab'
          : 'sf-drawing-surface__svg--default'
      : '';

  return (
    <div className="sf-drawing-surface">
      <div className="sf-drawing-surface__frame">
        <svg
          ref={svgRef}
          className={`sf-drawing-surface__svg ${cursorClass}`}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          data-render-tick={renderTick}
        >
          <rect width={CANVAS_W} height={CANVAS_H} fill={CANVAS_BG} />
          {displayStrokes.map((s, i) => (
            <StrokePath
              key={i}
              stroke={s}
              highlighted={tool === 'select' && activeSet.has(i)}
              dimmed={tool === 'select' && activeSet.size > 0 && !activeSet.has(i)}
            />
          ))}
          {inProgressStroke && <StrokePath stroke={inProgressStroke} />}
        </svg>
      </div>
    </div>
  );
}
