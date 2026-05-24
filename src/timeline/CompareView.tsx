import { useEffect, useMemo, useRef, useState } from 'react';
import type { Checkpoint } from '../types';
import { CANVAS_H, CANVAS_W } from '../types';
import { relativeTime } from '../lib/time';
import {
  buildPanelSvg,
  diffSvgAsync,
  type ChangeKind,
  type DiffChange,
  type DiffResult,
} from '../lib/diffStrokes';
import type { ComponentAnalysis } from '../lib/ai';
import {
  aiDescriptionAddsValue,
  detectionDetailLine,
} from '../lib/detailConsistency';
import { analyzeDiffComponentsConsistent } from '../lib/diffLabels';
import { buildIdentityHints } from '../lib/objectTracking';
import { parseStrokesFromSvg } from '../lib/serializeSvg';
import DiffOverlay from './DiffOverlay';
import './CompareView.css';

export interface CompareViewProps {
  left: Checkpoint;
  right: Checkpoint;
  checkpoints: Checkpoint[];
}

type Legend = Record<ChangeKind, boolean>;

const LEGEND_ITEMS: { k: ChangeKind; label: string }[] = [
  { k: 'add', label: 'added' },
  { k: 'rem', label: 'removed' },
  { k: 'mov', label: 'moved' },
];

function checkpointLabel(cp: Checkpoint): string {
  if (cp.note?.trim()) return cp.note.trim();
  return relativeTime(cp.createdAt);
}

function PanelSvg({ inner }: { inner: string }) {
  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="sf-diff__svg"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

export default function CompareView({ left, right, checkpoints }: CompareViewProps) {
  const [legend, setLegend] = useState<Legend>({
    add: true,
    rem: true,
    mov: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(true);
  const [analyses, setAnalyses] = useState<ComponentAnalysis[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDiffLoading(true);
    setResult(null);
    const fromIdx = checkpoints.findIndex((c) => c.id === left.id);
    const toIdx = checkpoints.findIndex((c) => c.id === right.id);
    const path =
      fromIdx >= 0 && toIdx > fromIdx
        ? {
            checkpoints,
            fromIdx,
            toIdx,
            beforeNote: left.note,
            afterNote: right.note,
          }
        : undefined;
    void diffSvgAsync(left.svgData, right.svgData, path).then((r) => {
      if (!cancelled) {
        setResult(r);
        setDiffLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [left.svgData, right.svgData, checkpoints, left.id, right.id]);

  const diffResult = result ?? {
    changes: [],
    unchangedCount: 0,
    beforeStrokes: [],
    afterStrokes: [],
  };

  const analysisById = useMemo(
    () => new Map(analyses.map((a) => [a.id, a])),
    [analyses],
  );

  const enrichedChanges = useMemo(
    () =>
      diffResult.changes.map((c) => {
        const a = analysisById.get(c.id);
        return a ? { ...c, aiDescription: a.description, componentLabel: a.label } : c;
      }),
    [diffResult.changes, analysisById],
  );

  const visibleChanges = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return enrichedChanges.filter((c) => {
      if (!legend[c.kind]) return false;
      if (!q) return true;
      const a = analysisById.get(c.id);
      const hay = [
        c.summary,
        c.detail,
        c.componentLabel,
        a?.label,
        a?.description,
        c.kind,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedChanges, legend, filter, analysisById]);

  const beforeInner = useMemo(() => {
    const strokes =
      diffResult.beforeStrokes.length > 0
        ? diffResult.beforeStrokes
        : (parseStrokesFromSvg(left.svgData) ?? []);
    return buildPanelSvg(strokes);
  }, [diffResult.beforeStrokes, left.svgData]);

  const afterInner = useMemo(() => {
    const strokes =
      diffResult.afterStrokes.length > 0
        ? diffResult.afterStrokes
        : (parseStrokesFromSvg(right.svgData) ?? []);
    return buildPanelSvg(strokes);
  }, [diffResult.afterStrokes, right.svgData]);

  useEffect(() => {
    setSelectedId(null);
    setHoveredId(null);
    setFilter('');
    setAnalyses([]);
    setAnalysisLoading(true);

    let cancelled = false;
    if (diffLoading || !result) return;

    const changes = result.changes;
    const identityHints = buildIdentityHints(checkpoints, left, right, changes);
    const projectId = left.projectId;
    void analyzeDiffComponentsConsistent({
      projectId,
      changes,
      before: left,
      after: right,
      checkpoints,
      ctx: { identityHints, checkpoints },
    }).then((comps) => {
      if (cancelled) return;
      setAnalyses(comps);
      setAnalysisLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [left.id, right.id, result, diffLoading, left, right, checkpoints]);

  useEffect(() => {
    if (!hoveredId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-change-id="${hoveredId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [hoveredId]);

  function toggleLegend(k: ChangeKind) {
    setLegend((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  function selectChange(c: DiffChange) {
    setSelectedId((prev) => (prev === c.id ? null : c.id));
  }

  const focusId = hoveredId ?? selectedId;

  function kindLabel(kind: ChangeKind): string {
    switch (kind) {
      case 'add':
        return 'added';
      case 'rem':
        return 'removed';
      case 'mov':
        return 'moved';
    }
  }

  return (
    <div className="sf-diff">
      <div className="sf-diff__frame">
        <div className="sf-diff__chrome">
          <span className="sf-diff__dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="mono">sketchflow · diff</span>
        </div>

        <div className="sf-diff__toolbar">
          <span className="sf-diff__toolbar-label mono">Compare</span>
          <span className="sf-diff__commit mono">{checkpointLabel(left)}</span>
          <span className="sf-diff__arrow">→</span>
          <span className="sf-diff__commit mono">{checkpointLabel(right)}</span>

          <span className="sf-diff__toolbar-sep" />

          <span className="sf-diff__toolbar-label mono">Show</span>
          {LEGEND_ITEMS.map((it) => (
            <button
              key={it.k}
              type="button"
              className={`sf-diff__pill sf-diff__pill--${it.k} ${legend[it.k] ? 'is-on' : ''}`}
              onClick={() => toggleLegend(it.k)}
            >
              {it.label}
            </button>
          ))}

          <span className="sf-diff__count mono">
            {diffLoading
              ? 'Running vision diff…'
              : `${visibleChanges.length} of ${diffResult.changes.length} components`}
          </span>
        </div>

        <div className="sf-diff__body">
          <div className="sf-diff__stage">
            <div className="sf-diff__hero">
              <div className="sf-diff__panel-head">
                <span className="sf-diff__panel-title">Diff overlay</span>
                <span className="sf-diff__panel-sub mono">
                  hover highlights · click to inspect
                </span>
              </div>
              <div className="sf-diff__hero-canvas">
                <DiffOverlay
                  result={diffResult}
                  visibleChanges={visibleChanges}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                  onSelect={(id) => {
                    const c = enrichedChanges.find((x) => x.id === id);
                    if (c) selectChange(c);
                  }}
                />
              </div>
            </div>

            <div className="sf-diff__refs">
              <div className="sf-diff__ref">
                <div className="sf-diff__panel-head">
                  <span className="sf-diff__panel-title">Before</span>
                  <span className="sf-diff__panel-sub mono">{checkpointLabel(left)}</span>
                </div>
                <div className="sf-diff__ref-canvas">
                  <PanelSvg inner={beforeInner} />
                </div>
              </div>
              <div className="sf-diff__ref">
                <div className="sf-diff__panel-head">
                  <span className="sf-diff__panel-title">After</span>
                  <span className="sf-diff__panel-sub mono">{checkpointLabel(right)}</span>
                </div>
                <div className="sf-diff__ref-canvas">
                  <PanelSvg inner={afterInner} />
                </div>
              </div>
            </div>
          </div>

          <aside className="sf-diff__rail">
            <div className="sf-diff__rail-head">
              <span className="sf-diff__panel-title">Changes</span>
              <span className="mono sf-diff__rail-count">{visibleChanges.length}</span>
            </div>

            <div className="sf-diff__rail-filter">
              <input
                type="search"
                className="sf-diff__filter-input"
                placeholder="Filter components…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            <div className="sf-diff__rail-list" ref={listRef}>
              {diffLoading ? (
                <p className="sf-diff__empty">Analyzing drawing with vision…</p>
              ) : diffResult.changes.length === 0 ? (
                <p className="sf-diff__empty">No changes between these checkpoints.</p>
              ) : visibleChanges.length === 0 ? (
                <p className="sf-diff__empty">
                  No matches — adjust filters or search.
                </p>
              ) : (
                visibleChanges.map((c) => {
                  const analysis = analysisById.get(c.id);
                  const title = analysis?.label ?? c.componentLabel;
                  const isOpen = selectedId === c.id;
                  const isActive = focusId === c.id;
                  return (
                    <div
                      key={c.id}
                      data-change-id={c.id}
                      className={`sf-diff__change-item ${isOpen ? 'is-open' : ''}`}
                    >
                      <button
                        type="button"
                        className={`sf-diff__change-header ${isActive ? 'is-active' : ''}`}
                        style={{ borderLeftColor: isActive ? c.color : undefined }}
                        aria-expanded={isOpen}
                        aria-controls={`change-panel-${c.id}`}
                        onClick={() => selectChange(c)}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <span
                          className="sf-diff__change-dot"
                          style={{ background: c.color }}
                        />
                        <span className="sf-diff__change-body">
                          <span className="sf-diff__change-title-row">
                            <span className="sf-diff__change-title mono">{title}</span>
                            <span className={`sf-diff__change-kind sf-diff__change-kind--${c.kind}`}>
                              {kindLabel(c.kind)}
                            </span>
                          </span>
                          {!isOpen && (
                            <span className="sf-diff__change-preview">
                              {detectionDetailLine(c)}
                            </span>
                          )}
                        </span>
                        <span className="sf-diff__change-chevron" aria-hidden>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M6 9l6 6 6-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </button>
                      {isOpen && (
                        <div
                          id={`change-panel-${c.id}`}
                          className="sf-diff__change-panel"
                          role="region"
                          aria-label={`Details for ${title}`}
                        >
                          <div className="sf-diff__change-panel-inner">
                            <p className="sf-diff__change-panel-detail">
                              {detectionDetailLine(c)}
                            </p>
                            {analysis?.description &&
                            aiDescriptionAddsValue(analysis.description, c) ? (
                              <p className="sf-diff__change-panel-ai">{analysis.description}</p>
                            ) : analysisLoading && !analysis ? (
                              <p className="sf-diff__change-panel-ai sf-diff__change-panel-ai--loading">
                                Analyzing…
                              </p>
                            ) : null}
                            {analysis?.beforeDescription && (
                              <p className="sf-diff__change-panel-meta">
                                <span className="mono">Before</span> {analysis.beforeDescription}
                              </p>
                            )}
                            {analysis?.afterDescription && (
                              <p className="sf-diff__change-panel-meta">
                                <span className="mono">After</span> {analysis.afterDescription}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
