import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryFolder } from '../types';
import { usePanZoom } from '../canvas/usePanZoom';
import {
  BRANCH_COLORS,
  buildFamilyGraph,
  edgeLabelPoint,
  layoutTreeFamilyGraph,
  NODE_R,
  ROOT_R,
  treeEdgePath,
  truncateLabel,
  type FamilyGraphData,
} from '../lib/familyGraph';
import { listGalleryLayout } from '../lib/storage';
import './FamilyGraph.css';

export interface FamilyGraphProps {
  rootProjectId: string;
  onBack: () => void;
  onOpenProject: (projectId: string, screen: 'canvas' | 'timeline') => void;
}

export default function FamilyGraph({
  rootProjectId,
  onBack,
  onOpenProject,
}: FamilyGraphProps) {
  const [folder, setFolder] = useState<GalleryFolder | null>(null);
  const [graph, setGraph] = useState<FamilyGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { transform, reset, handlers } = usePanZoom();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const layout = await listGalleryLayout();
        const match = layout.folders.find((f) => f.root.id === rootProjectId);
        if (!match) {
          if (!cancelled) {
            setError('This sketch family could not be found.');
            setFolder(null);
            setGraph(null);
          }
          return;
        }
        if (cancelled) return;
        setFolder(match);
        setGraph(await buildFamilyGraph(match.root, match.variants));
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load graph.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rootProjectId]);

  const layout = useMemo(() => {
    if (!graph) return null;
    return layoutTreeFamilyGraph(graph.nodes, graph.edges, graph.root.id);
  }, [graph]);

  const highlightedEdges = useMemo(() => {
    if (!hoveredId || !graph) return new Set<string>();
    const keys = new Set<string>();
    for (const e of graph.edges) {
      if (e.fromId === hoveredId || e.toId === hoveredId) {
        keys.add(`${e.fromId}-${e.toId}`);
      }
    }
    return keys;
  }, [hoveredId, graph]);

  useEffect(() => {
    if (!layout || !viewportRef.current) return;
    const el = viewportRef.current;

    const fitToView = () => {
      const vp = el.getBoundingClientRect();
      if (vp.width < 48 || vp.height < 48) return;

      const b = layout.contentBounds;
      const contentW = Math.max(1, b.maxX - b.minX);
      const contentH = Math.max(1, b.maxY - b.minY);
      const margin = 48;
      const fitScale = Math.min(
        (vp.width - margin) / contentW,
        (vp.height - margin) / contentH,
      );
      if (!Number.isFinite(fitScale) || fitScale <= 0) return;

      const scale = Math.min(1.5, Math.max(0.4, fitScale * 1.15));
      reset({
        scale,
        x: (vp.width - contentW * scale) / 2 - b.minX * scale,
        y: (vp.height - contentH * scale) / 2 - b.minY * scale,
      });
    };

    fitToView();
    const observer = new ResizeObserver(() => fitToView());
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout, reset]);

  return (
    <div className="sf-family">
      <header className="sf-family__header">
        <button type="button" className="sf-btn sf-btn--ghost" onClick={onBack}>
          ← Gallery
        </button>
        <h1 className="sf-family__title">{folder?.root.title ?? 'Sketch tree'}</h1>
        <span className="sf-family__hint">Drag to pan · scroll to zoom</span>
      </header>

      {error && <p className="sf-family__msg">{error}</p>}
      {loading && !error && <p className="sf-family__msg">Loading…</p>}

      {!loading && graph && layout && !error && (
        <div ref={viewportRef} className="sf-family__viewport" {...handlers}>
          <div
            className="sf-family__stage"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              className="sf-family__graph"
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="img"
              aria-label={`Sketch family tree for ${folder?.root.title}`}
            >
              <g className="sf-family__edges">
                {graph.edges.map((edge) => {
                  const a = layout.positions.get(edge.fromId);
                  const b = layout.positions.get(edge.toId);
                  if (!a || !b) return null;
                  const fromNode = graph.nodes.find((n) => n.id === edge.fromId);
                  const fromIsRoot = fromNode?.kind === 'root';
                  const key = `${edge.fromId}-${edge.toId}`;
                  const active = highlightedEdges.has(key);
                  const color =
                    BRANCH_COLORS[b.branchIndex % BRANCH_COLORS.length];
                  const labelPt = edgeLabelPoint(
                    a.cx,
                    a.cy,
                    b.cx,
                    b.cy,
                    fromIsRoot,
                  );
                  return (
                    <g
                      key={key}
                      className={`sf-family__edge-g ${active ? 'is-active' : ''}`}
                    >
                      <path
                        d={treeEdgePath(a.cx, a.cy, b.cx, b.cy, fromIsRoot)}
                        stroke={color}
                        className="sf-family__edge"
                        fill="none"
                      />
                      <text
                        x={labelPt.x}
                        y={labelPt.y - 6}
                        className="sf-family__edge-label"
                      >
                        {truncateLabel(edge.label, 24)}
                      </text>
                    </g>
                  );
                })}
              </g>

              <g className="sf-family__nodes">
                {graph.nodes.map((node) => {
                  const pos = layout.positions.get(node.id);
                  if (!pos) return null;
                  const isRoot = node.kind === 'root';
                  const r = isRoot ? ROOT_R : NODE_R;
                  const color =
                    pos.branchIndex >= 0
                      ? BRANCH_COLORS[pos.branchIndex % BRANCH_COLORS.length]
                      : '#3d3832';
                  const active = hoveredId === node.id;
                  const labelX = pos.cx + r + 10;
                  const labelY = pos.cy + 4;

                  return (
                    <g
                      key={node.id}
                      className={`sf-family__node ${active ? 'is-active' : ''}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseEnter={() => setHoveredId(node.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProject(node.id, 'canvas');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenProject(node.id, 'canvas');
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={pos.cx}
                        cy={pos.cy}
                        r={r}
                        fill={isRoot ? '#3d3832' : color}
                        className="sf-family__dot"
                      />
                      {isRoot && (
                        <circle
                          cx={pos.cx}
                          cy={pos.cy}
                          r={r + 4}
                          className="sf-family__dot-halo"
                          fill="none"
                        />
                      )}
                      <text
                        x={labelX}
                        y={labelY}
                        className={`sf-family__node-label ${isRoot ? 'is-root' : ''}`}
                        fill={isRoot ? '#3d3832' : color}
                      >
                        {truncateLabel(node.displayName, isRoot ? 36 : 28)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
