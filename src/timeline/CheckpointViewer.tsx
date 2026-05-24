import type { Checkpoint, ProjectBranch } from '../types';
import { relativeTime } from '../lib/time';
import BranchFork from './BranchFork';
import './CheckpointViewer.css';

export interface CheckpointViewerProps {
  checkpoint: Checkpoint;
  checkpointIndex: number;
  checkpointCount: number;
  isLatest: boolean;
  branchingAvailable?: boolean;
  existingBranches?: ProjectBranch[];
  branching?: boolean;
  onRestore?: () => void;
  onOpenBranch?: (branchProjectId: string) => void;
}

export default function CheckpointViewer({
  checkpoint,
  checkpointIndex,
  checkpointCount,
  isLatest,
  branchingAvailable = true,
  existingBranches = [],
  branching = false,
  onRestore,
  onOpenBranch,
}: CheckpointViewerProps) {
  const saveLabel = checkpointIndex + 1;

  return (
    <div className="sf-viewer">
      <div
        className="sf-viewer__frame"
        dangerouslySetInnerHTML={{ __html: checkpoint.svgData }}
      />
      <div className="sf-viewer__meta">
        <div className="sf-viewer__text">
          <div className="sf-viewer__note">
            {checkpoint.note?.trim() ? checkpoint.note : <em>No note</em>}
          </div>
          <div className="sf-viewer__time">
            Save {saveLabel} of {checkpointCount} · saved{' '}
            {relativeTime(checkpoint.createdAt)}
          </div>
          {!isLatest && branchingAvailable && (
            <p className="sf-viewer__branch-hint">
              This is not your latest save. Continuing here creates a separate variant
              with saves 1–{saveLabel} copied in — your main timeline stays unchanged.
            </p>
          )}
          {!isLatest && !branchingAvailable && (
            <p className="sf-viewer__branch-hint">
              Variant branching is not set up on this database yet. You can still restore
              this save on the canvas; separate variant sketches need{' '}
              <code>supabase/schema-branches.sql</code> run in Supabase when you have access.
            </p>
          )}
        </div>
        <div className="sf-viewer__actions">
          {onRestore && (
            <button
              className="sf-btn sf-btn--primary"
              onClick={onRestore}
              disabled={branching}
            >
              {branching
                ? 'Creating variant…'
                : 'Keep working from here'}
            </button>
          )}
          {existingBranches.length > 0 && onOpenBranch && (
            <div className="sf-viewer__branches">
              <span className="sf-viewer__branches-label">Variants from this save</span>
              <BranchFork branches={existingBranches} onOpenBranch={onOpenBranch} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
