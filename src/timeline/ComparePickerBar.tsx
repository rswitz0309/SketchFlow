import type { Checkpoint } from '../types';
import { relativeTime } from '../lib/time';
import './ComparePickerBar.css';

export type ComparePickTarget = 'before' | 'after';

export interface ComparePickerBarProps {
  checkpoints: Checkpoint[];
  before: Checkpoint | null;
  after: Checkpoint | null;
  pickTarget: ComparePickTarget;
  onPickTargetChange: (target: ComparePickTarget) => void;
}

function slotLabel(cp: Checkpoint | null, checkpoints: Checkpoint[]): string {
  if (!cp) return 'Choose a save…';
  const i = checkpoints.findIndex((c) => c.id === cp.id);
  const num = i >= 0 ? i + 1 : '?';
  const note = cp.note?.trim();
  if (note) return `Save ${num} · ${note}`;
  return `Save ${num}`;
}

export default function ComparePickerBar({
  checkpoints,
  before,
  after,
  pickTarget,
  onPickTargetChange,
}: ComparePickerBarProps) {
  return (
    <div className="sf-compare-pick">
      <p className="sf-compare-pick__hint">
        Select a slot, then click a save in the grid. Earlier save = Before, later = After.
      </p>
      <div className="sf-compare-pick__slots" role="group" aria-label="Compare range">
        <button
          type="button"
          className={`sf-compare-pick__slot ${pickTarget === 'before' ? 'is-active' : ''} ${
            before ? 'has-value' : ''
          }`}
          onClick={() => onPickTargetChange('before')}
          aria-pressed={pickTarget === 'before'}
        >
          <span className="sf-compare-pick__slot-label">Before</span>
          <span className="sf-compare-pick__slot-value">{slotLabel(before, checkpoints)}</span>
          {before && (
            <span className="sf-compare-pick__slot-time mono">
              {relativeTime(before.createdAt)}
            </span>
          )}
        </button>
        <span className="sf-compare-pick__arrow" aria-hidden>
          →
        </span>
        <button
          type="button"
          className={`sf-compare-pick__slot ${pickTarget === 'after' ? 'is-active' : ''} ${
            after ? 'has-value' : ''
          }`}
          onClick={() => onPickTargetChange('after')}
          aria-pressed={pickTarget === 'after'}
        >
          <span className="sf-compare-pick__slot-label">After</span>
          <span className="sf-compare-pick__slot-value">{slotLabel(after, checkpoints)}</span>
          {after && (
            <span className="sf-compare-pick__slot-time mono">
              {relativeTime(after.createdAt)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
