import type { Checkpoint } from '../types';
import { relativeTime } from '../lib/time';
import './CheckpointViewer.css';

export interface CheckpointViewerProps {
  checkpoint: Checkpoint;
  onRestore?: () => void;
}

export default function CheckpointViewer({
  checkpoint,
  onRestore,
}: CheckpointViewerProps) {
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
            Saved {relativeTime(checkpoint.createdAt)}
          </div>
        </div>
        {onRestore && (
          <button className="sf-btn sf-btn--primary" onClick={onRestore}>
            Keep working from here
          </button>
        )}
      </div>
    </div>
  );
}
