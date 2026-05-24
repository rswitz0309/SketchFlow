import { useEffect, useRef } from 'react';
import type { Checkpoint, ProjectBranch } from '../types';
import { relativeTime } from '../lib/time';
import BranchFork from './BranchFork';
import './CheckpointStrip.css';

export interface CheckpointStripProps {
  checkpoints: Checkpoint[];
  selectedId: string | null;
  /** Persistent highlight for the save this variant was forked from. */
  highlightedId?: string | null;
  onSelect: (id: string) => void;
  mode: 'view' | 'compare';
  compareIds?: [string | null, string | null];
  onCompareSelect?: (id: string) => void;
  branchesByCheckpoint?: Map<string, ProjectBranch[]>;
  onOpenBranch?: (branchProjectId: string) => void;
}

export default function CheckpointStrip(props: CheckpointStripProps) {
  const {
    checkpoints,
    selectedId,
    highlightedId,
    onSelect,
    mode,
    compareIds,
    onCompareSelect,
    branchesByCheckpoint,
    onOpenBranch,
  } = props;

  const highlightRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!highlightedId || mode !== 'view') return;
    highlightRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [highlightedId, mode, checkpoints.length]);

  if (checkpoints.length === 0) {
    return (
      <div className="sf-strip sf-strip--empty">
        <p>Save your first checkpoint to start your timeline.</p>
      </div>
    );
  }

  return (
    <div className="sf-strip" role="listbox" aria-label="Saved checkpoints">
      {checkpoints.map((c, i) => {
        const isCompareA = compareIds?.[0] === c.id;
        const isCompareB = compareIds?.[1] === c.id;
        const isSelected = mode === 'view' ? selectedId === c.id : false;
        const isForkHighlight = mode === 'view' && highlightedId === c.id;
        const compareIndex = isCompareA ? 0 : isCompareB ? 1 : null;
        const compareLabel =
          compareIndex === 0 ? 'Before' : compareIndex === 1 ? 'After' : null;
        const branches = branchesByCheckpoint?.get(c.id) ?? [];

        return (
          <div key={c.id} className="sf-strip__column">
            <button
              ref={isForkHighlight ? highlightRef : undefined}
              className={`sf-strip__item ${isSelected ? 'is-selected' : ''} ${
                isForkHighlight ? 'is-fork-origin' : ''
              } ${compareIndex !== null ? `is-compare-${compareIndex}` : ''}`}
              onClick={() => {
                if (mode === 'compare' && onCompareSelect) onCompareSelect(c.id);
                else onSelect(c.id);
              }}
              role="option"
              aria-selected={isSelected || compareIndex !== null}
              title={c.note ?? 'Checkpoint'}
            >
              <div className="sf-strip__thumb">
                {c.thumbnailDataUrl ? (
                  <img src={c.thumbnailDataUrl} alt="" />
                ) : (
                  <div className="sf-strip__thumb-fallback" />
                )}
                {compareLabel && (
                  <span className="sf-strip__compare-badge">{compareLabel}</span>
                )}
                {isForkHighlight && (
                  <span className="sf-strip__fork-badge">Variant start</span>
                )}
                <span className="sf-strip__num">{i + 1}</span>
              </div>
              <div className="sf-strip__meta">
                <span className="sf-strip__note">
                  {c.note?.trim() ? c.note : <em>No note</em>}
                </span>
                <span className="sf-strip__time">{relativeTime(c.createdAt)}</span>
              </div>
            </button>
            {mode === 'view' && branches.length > 0 && onOpenBranch && (
              <BranchFork branches={branches} onOpenBranch={onOpenBranch} />
            )}
          </div>
        );
      })}
    </div>
  );
}
