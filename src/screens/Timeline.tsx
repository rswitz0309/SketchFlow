import { useEffect, useMemo, useState } from 'react';
import type { Checkpoint, Project } from '../types';
import { normalizeCompareIds, orderedCompareCheckpoints } from '../lib/compareOrder';
import { getProject, listCheckpoints } from '../lib/storage';
import { parseStrokesFromSvg } from '../lib/serializeSvg';
import { clearAutosave, saveAutosave } from '../canvas/useAutosave';
import CheckpointStrip from '../timeline/CheckpointStrip';
import CheckpointViewer from '../timeline/CheckpointViewer';
import Scrubber from '../timeline/Scrubber';
import CompareView from '../timeline/CompareView';
import ProgressNotesPanel from '../timeline/ProgressNotesPanel';
import './Timeline.css';

export interface TimelineProps {
  projectId: string;
  onBack: () => void;
  onOpenCanvas: () => void;
  onRestore: (svgData: string) => void;
}

type Mode = 'view' | 'compare';

export default function Timeline({
  projectId,
  onBack,
  onOpenCanvas,
  onRestore,
}: TimelineProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [index, setIndex] = useState(0);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  useEffect(() => {
    setMode('view');
    setCompareIds([null, null]);
    setIndex(0);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [p, cps] = await Promise.all([
          getProject(projectId),
          listCheckpoints(projectId),
        ]);
        if (cancelled) return;
        if (!p) {
          onBack();
          return;
        }
        setProject(p);
        setCheckpoints(cps);
        setIndex(Math.max(0, cps.length - 1));
        setCompareIds([null, null]);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error(e);
        setError(
          e instanceof Error ? e.message : 'Could not load this timeline.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const selected = checkpoints[index] ?? null;

  const [compareBefore, compareAfter] = useMemo(
    () => orderedCompareCheckpoints(checkpoints, compareIds),
    [compareIds, checkpoints],
  );

  function handleToggleCompare(id: string) {
    setCompareIds((prev) => {
      const [a, b] = prev;
      let next: [string | null, string | null];
      if (a === id) next = [b, null];
      else if (b === id) next = [a, null];
      else if (!a) next = [id, b];
      else if (!b) next = [a, id];
      else next = [b, id];
      return normalizeCompareIds(checkpoints, next);
    });
  }

  function handleRestore() {
    if (!selected) return;
    try {
      const next = parseStrokesFromSvg(selected.svgData);
      if (next && next.length > 0) {
        saveAutosave(projectId, next);
      } else {
        clearAutosave(projectId);
      }
    } catch {
      clearAutosave(projectId);
    }
    onRestore(selected.svgData);
  }

  return (
    <div className="sf-timeline">
      <header className="sf-timeline__header">
        <div className="sf-timeline__nav">
          <button
            className="sf-btn sf-btn--ghost"
            onClick={onBack}
            aria-label="Back to gallery"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Gallery</span>
          </button>
          <span className="sf-timeline__sep" aria-hidden>/</span>
          <h1 className="sf-timeline__title">
            {project?.title ?? 'Your timeline'}
          </h1>
          <span className="sf-timeline__eyebrow">Your timeline</span>
        </div>
        <div className="sf-timeline__actions">
          <div className="sf-timeline__modeswitch" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'view'}
              className={`sf-timeline__modebtn ${mode === 'view' ? 'is-active' : ''}`}
              onClick={() => setMode('view')}
            >
              View
            </button>
            <button
              role="tab"
              aria-selected={mode === 'compare'}
              className={`sf-timeline__modebtn ${mode === 'compare' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('compare');
                if (!compareIds[0] && !compareIds[1] && checkpoints.length >= 2) {
                  setCompareIds([
                    checkpoints[checkpoints.length - 2].id,
                    checkpoints[checkpoints.length - 1].id,
                  ]);
                }
              }}
              disabled={checkpoints.length < 2}
              title={
                checkpoints.length < 2
                  ? 'Save at least two checkpoints to compare'
                  : 'Compare versions'
              }
            >
              Compare diff
            </button>
          </div>
          <button className="sf-btn" onClick={onOpenCanvas}>
            Back to canvas
          </button>
        </div>
      </header>

      {error && <div className="sf-timeline__error">{error}</div>}

      <div className="sf-timeline__main">
        {mode === 'view' ? (
          selected ? (
            <CheckpointViewer checkpoint={selected} onRestore={handleRestore} />
          ) : (
            <div className="sf-timeline__empty">
              <div className="sf-timeline__empty-art" aria-hidden>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect
                    x="10"
                    y="20"
                    width="100"
                    height="70"
                    rx="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.3"
                  />
                  <path
                    d="M20 75l20-20 15 15 25-25 20 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.5"
                  />
                </svg>
              </div>
              <h2>No checkpoints yet</h2>
              <p>Head back to the canvas and save your first checkpoint to start your timeline.</p>
              <button className="sf-btn sf-btn--primary" onClick={onOpenCanvas}>
                Go to canvas
              </button>
            </div>
          )
        ) : compareBefore && compareAfter ? (
          <CompareView
            left={compareBefore}
            right={compareAfter}
            checkpoints={checkpoints}
          />
        ) : (
          <div className="sf-timeline__compare-hint">
            Pick two checkpoints below to compare.
          </div>
        )}
      </div>

      {mode === 'view' && (
        <div className="sf-timeline__scrubber-wrap">
          <Scrubber
            checkpoints={checkpoints}
            index={index}
            onIndexChange={setIndex}
          />
          <ProgressNotesPanel projectId={projectId} checkpoints={checkpoints} />
        </div>
      )}

      <CheckpointStrip
        checkpoints={checkpoints}
        selectedId={selected?.id ?? null}
        onSelect={(id) => {
          const i = checkpoints.findIndex((c) => c.id === id);
          if (i >= 0) setIndex(i);
        }}
        mode={mode}
        compareIds={compareIds}
        onToggleCompare={handleToggleCompare}
      />
    </div>
  );
}

