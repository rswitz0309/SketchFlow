import { CANVAS_H, CANVAS_W, type Stroke } from '../types';
import { strokesToInnerSvg } from '../lib/serializeSvg';
import type { Bounds, DiffChange, DiffResult } from '../lib/diffStrokes';
import './DiffOverlay.css';

export interface DiffOverlayProps {
  result: DiffResult;
  visibleChanges: DiffChange[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function moveArrow(from: Bounds, to: Bounds, color: string): React.ReactNode {
  const fx = from.x + from.w / 2;
  const fy = from.y + from.h / 2;
  const tx = to.x + to.w / 2;
  const ty = to.y + to.h / 2;
  return (
    <g stroke={color} strokeWidth={2} fill="none" opacity={0.9}>
      <line x1={fx} y1={fy} x2={tx} y2={ty} markerEnd="url(#sf-diff-arrow)" />
    </g>
  );
}

function highlightOpacity(
  c: DiffChange,
  selectedId: string | null,
  hoveredId: string | null,
): number {
  if (!selectedId && !hoveredId) return 1;
  if (c.id === selectedId || c.id === hoveredId) return 1;
  return 0.35;
}

function tintedStrokes(strokes: Stroke[], color: string): string {
  return strokesToInnerSvg(strokes.map((s) => ({ ...s, color })));
}

export default function DiffOverlay({
  result,
  visibleChanges,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: DiffOverlayProps) {
  const { afterStrokes, beforeStrokes } = result;
  const baseStrokes = afterStrokes.length ? afterStrokes : beforeStrokes;
  const focusId = hoveredId ?? selectedId;
  const arrowColor =
    visibleChanges.find((c) => c.kind === 'mov')?.color ?? '#2563eb';

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="sf-diff-overlay"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="sf-diff-arrow"
          markerWidth={8}
          markerHeight={8}
          refX={6}
          refY={3}
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill={arrowColor} />
        </marker>
      </defs>

      <g dangerouslySetInnerHTML={{ __html: strokesToInnerSvg(baseStrokes) }} />

      {visibleChanges
        .filter((c) => c.kind === 'rem' && c.beforeMemberStrokes?.length)
        .map((c) => (
          <g
            key={`ghost-${c.id}`}
            opacity={0.55 * highlightOpacity(c, selectedId, hoveredId)}
            dangerouslySetInnerHTML={{
              __html: tintedStrokes(c.beforeMemberStrokes!, c.color),
            }}
          />
        ))}

      {visibleChanges
        .filter((c) => c.kind === 'mov' && c.beforeBounds)
        .map((c) => (
          <g
            key={`arrow-${c.id}`}
            opacity={highlightOpacity(c, selectedId, hoveredId)}
          >
            {moveArrow(c.beforeBounds!, c.bounds, c.color)}
          </g>
        ))}

      {visibleChanges.map((c) => {
        const active = c.id === focusId;
        const dimmed = focusId != null && !active;
        const sw = active ? 3 : 2;
        const dash = c.kind === 'rem' ? '6 4' : undefined;
        return (
          <rect
            key={c.id}
            x={c.bounds.x}
            y={c.bounds.y}
            width={c.bounds.w}
            height={c.bounds.h}
            fill={c.colorFill}
            stroke={c.color}
            strokeWidth={sw}
            strokeDasharray={dash}
            rx={6}
            className={`sf-diff-overlay__hit ${active ? 'is-active' : ''} ${dimmed ? 'is-dimmed' : ''}`}
            opacity={highlightOpacity(c, selectedId, hoveredId)}
            onMouseEnter={() => onHover(c.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(c.id)}
          >
            <title>{c.summary}</title>
          </rect>
        );
      })}
    </svg>
  );
}
