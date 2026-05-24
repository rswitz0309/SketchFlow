import { useEffect, useMemo, useRef, useState } from 'react';
import type { Checkpoint } from '../types';
import { CANVAS_H, CANVAS_W } from '../types';
import { relativeTime } from '../lib/time';
import {
  buildPanelSvg,
  diffSvg,
  type ChangeKind,
  type DiffChange,
} from '../lib/diffStrokes';
import {
  analyzeDiffComponents,
  generateDiffSummary,
  hasAiKey,
  type ComponentAnalysis,
} from '../lib/ai';
import { parseStrokesFromSvg } from '../lib/serializeSvg';
import DiffOverlay from './DiffOverlay';
import './CompareView.css';

export interface CompareViewProps {
  left: Checkpoint;
  right: Checkpoint;
}

type Legend = Record<ChangeKind, boolean>;

const LEGEND_ITEMS: { k: ChangeKind; label: string }[] = [
  { k: 'add', label: 'added' },
  { k: 'rem', label: 'removed' },
  { k: 'mov', label: 'moved' },
  { k: 'sty', label: 'restyled' },
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

export default function CompareView({ left, right }: CompareViewProps) {
  const [legend, setLegend] = useState<Legend>({
    add: true,
    rem: true,
    mov: true,
    sty: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [analyses, setAnalyses] = useState<ComponentAnalysis[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () => diffSvg(left.svgData, right.svgData),
    [left.svgData, right.svgData],
  );

  const analysisById = useMemo(
    () => new Map(analyses.map((a) => [a.id, a])),
    [analyses],
  );

  const enrichedChanges = useMemo(
    () =>
      result.changes.map((c) => {
        const a = analysisById.get(c.id);
        return a ? { ...c, aiDescription: a.description, componentLabel: a.label } : c;
      }),
    [result.changes, analysisById],
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
      result.beforeStrokes.length > 0
        ? result.beforeStrokes
        : (parseStrokesFromSvg(left.svgData) ?? []);
    return buildPanelSvg(strokes);
  }, [result.beforeStrokes, left.svgData]);

  const afterInner = useMemo(() => {
    const strokes =
      result.afterStrokes.length > 0
        ? result.afterStrokes
        : (parseStrokesFromSvg(right.svgData) ?? []);
    return buildPanelSvg(strokes);
  }, [result.afterStrokes, right.svgData]);

  useEffect(() => {
    setSelectedId(null);
    setHoveredId(null);
    setFilter('');
    setSummary(null);
    setAnalyses([]);
    setAnalysisLoading(true);
    setSummaryLoading(true);

    let cancelled = false;
    const changes = result.changes;

    void (async () => {
      const comps = await analyzeDiffComponents(changes, left, right);
      if (cancelled) return;
      setAnalyses(comps);
      setAnalysisLoading(false);
      const text = await generateDiffSummary(changes, left, right, comps);
      if (cancelled) return;
      setSummary(text);
      setSummaryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [left.id, right.id, result.changes, left, right]);

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

  const aiMode = hasAiKey();
  const selected = enrichedChanges.find((c) => c.id === selectedId);
  const focusId = hoveredId ?? selectedId;

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
              <span className="sf-diff__pill-swatch" />
              {it.label}
            </button>
          ))}

          <span className="sf-diff__count mono">
            {visibleChanges.length} of {result.changes.length} components
          </span>
        </div>

        {summaryLoading ? (
          <div className="sf-diff__summary sf-diff__summary--loading mono">
            Analyzing components…
          </div>
        ) : summary ? (
          <div className="sf-diff__summary">
            {summary}
            {!aiMode && <span className="sf-diff__summary-badge mono">demo</span>}
          </div>
        ) : null}

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
                  result={result}
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
              {result.changes.length === 0 ? (
                <p className="sf-diff__empty">No changes between these checkpoints.</p>
              ) : visibleChanges.length === 0 ? (
                <p className="sf-diff__empty">
                  No matches — adjust filters or search.
                </p>
              ) : (
                visibleChanges.map((c) => {
                  const analysis = analysisById.get(c.id);
                  const title = analysis?.label ?? c.componentLabel;
                  const isActive = focusId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-change-id={c.id}
                      className={`sf-diff__change ${isActive ? 'is-active' : ''}`}
                      style={{ borderLeftColor: isActive ? c.color : undefined }}
                      onClick={() => selectChange(c)}
                      onMouseEnter={() => setHoveredId(c.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <span
                        className="sf-diff__change-dot"
                        style={{ background: c.color }}
                      />
                      <span className="sf-diff__change-body">
                        <span className="sf-diff__change-title mono">{title}</span>
                        <span className="sf-diff__change-detail">
                          {c.summary}
                          {analysis?.description ? (
                            <> · {analysis.description}</>
                          ) : analysisLoading ? (
                            <> · analyzing…</>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {selected && (
              <div className="sf-diff__inspector">
                <div className="sf-diff__inspector-eyebrow mono">Inspector</div>
                <div
                  className="sf-diff__inspector-kind mono"
                  style={{ color: selected.color }}
                >
                  {analysisById.get(selected.id)?.label ?? selected.componentLabel}
                </div>
                <div className="sf-diff__inspector-meta mono">{selected.kind}</div>
                <div className="sf-diff__inspector-detail">{selected.detail}</div>
                {(() => {
                  const analysis = analysisById.get(selected.id);
                  if (!analysis) return null;
                  return (
                    <div className="sf-diff__inspector-ai">
                      <p>{analysis.description}</p>
                      {analysis.beforeDescription && (
                        <p className="sf-diff__inspector-before">
                          <span className="mono">Before</span> {analysis.beforeDescription}
                        </p>
                      )}
                      {analysis.afterDescription && (
                        <p className="sf-diff__inspector-after">
                          <span className="mono">After</span> {analysis.afterDescription}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
