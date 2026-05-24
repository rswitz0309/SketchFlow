import type { Checkpoint } from '../types';
import { relativeTime } from '../lib/time';
import './CheckpointStrip.css';

export interface CheckpointStripProps {
  checkpoints: Checkpoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode: 'view' | 'compare';
  compareIds?: [string | null, string | null];
  onToggleCompare?: (id: string) => void;
}

export default function CheckpointStrip(props: CheckpointStripProps) {
  const {
    checkpoints,
    selectedId,
    onSelect,
    mode,
    compareIds,
    onToggleCompare,
  } = props;

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
        const compareIndex = isCompareA ? 0 : isCompareB ? 1 : null;
        const compareLabel =
          compareIndex === 0 ? 'Before' : compareIndex === 1 ? 'After' : null;

        return (
          <button
            key={c.id}
            className={`sf-strip__item ${isSelected ? 'is-selected' : ''} ${
              compareIndex !== null ? `is-compare-${compareIndex}` : ''
            }`}
            onClick={() => {
              if (mode === 'compare' && onToggleCompare) onToggleCompare(c.id);
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
              <span className="sf-strip__num">{i + 1}</span>
            </div>
            <div className="sf-strip__meta">
              <span className="sf-strip__note">
                {c.note?.trim() ? c.note : <em>No note</em>}
              </span>
              <span className="sf-strip__time">{relativeTime(c.createdAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
