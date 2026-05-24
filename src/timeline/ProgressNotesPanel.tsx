import { useState } from 'react';
import type { Checkpoint } from '../types';
import { generateProgressNotes, hasAiKey } from '../lib/ai';
import './ProgressNotesPanel.css';

export interface ProgressNotesPanelProps {
  checkpoints: Checkpoint[];
}

export default function ProgressNotesPanel({ checkpoints }: ProgressNotesPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    try {
      const result = await generateProgressNotes(checkpoints);
      setText(result);
      setOpen(true);
    } catch (e) {
      console.error('Progress notes failed', e);
      setText('Could not generate progress notes right now. Try again in a moment.');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const liveMode = hasAiKey();

  return (
    <div className="sf-notes">
      {!open ? (
        <button
          className="sf-btn sf-notes__cta"
          onClick={() => void run()}
          disabled={loading || checkpoints.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l1.6 4.8L18 8.4l-4.4 1.6L12 14.8l-1.6-4.8L6 8.4l4.4-1.6L12 2zM18 14l.9 2.7L21.5 17.6l-2.6 1L18 21.2l-.9-2.7L14.5 17.6l2.6-1L18 14z"
              fill="currentColor"
            />
          </svg>
          <span>{loading ? 'Reading your timeline…' : 'Generate progress notes'}</span>
          {!liveMode && <span className="sf-notes__demo">demo</span>}
        </button>
      ) : (
        <div className="sf-notes__panel">
          <div className="sf-notes__header">
            <div className="sf-notes__eyebrow">
              Progress notes {liveMode ? '' : '· demo'}
            </div>
            <button
              className="sf-btn sf-btn--ghost sf-btn--icon"
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              title="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <p className="sf-notes__text">{text}</p>
          <button
            className="sf-btn sf-btn--ghost sf-notes__refresh"
            onClick={() => void run()}
            disabled={loading}
          >
            {loading ? 'Rewriting…' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}
