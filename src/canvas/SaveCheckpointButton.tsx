import { useEffect, useRef, useState } from 'react';
import './SaveCheckpointButton.css';

export interface SaveCheckpointButtonProps {
  onSave: (note: string) => Promise<void>;
  disabled?: boolean;
}

type State = 'idle' | 'open' | 'saving' | 'saved';

export default function SaveCheckpointButton(props: SaveCheckpointButtonProps) {
  const { onSave, disabled } = props;
  const [state, setState] = useState<State>('idle');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'open') {
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  useEffect(() => {
    if (state !== 'open') return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setState('idle');
        setNote('');
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setState('idle');
        setNote('');
      }
    }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [state]);

  useEffect(() => {
    if (state === 'saved') {
      const t = window.setTimeout(() => setState('idle'), 1600);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  async function commit() {
    setState('saving');
    try {
      await onSave(note.trim());
      setNote('');
      setState('saved');
    } catch (e) {
      console.error('Save failed', e);
      setState('open');
    }
  }

  return (
    <div className="sf-save">
      <button
        className={`sf-btn sf-btn--primary sf-save__cta ${
          state === 'saved' ? 'is-saved' : ''
        }`}
        onClick={() => {
          if (state === 'idle') setState('open');
          else if (state === 'open') void commit();
        }}
        disabled={disabled || state === 'saving'}
        aria-haspopup="dialog"
      >
        {state === 'saving' ? (
          <span>Saving…</span>
        ) : state === 'saved' ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Saved</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            <span>Save checkpoint</span>
          </>
        )}
      </button>

      {state === 'open' && (
        <div
          ref={popoverRef}
          className="sf-save__popover"
          role="dialog"
          aria-label="Save checkpoint"
        >
          <label className="sf-save__label" htmlFor="sf-save-note">
            Add a note (optional)
          </label>
          <input
            id="sf-save-note"
            ref={inputRef}
            className="sf-input sf-save__input"
            placeholder="e.g. blocked in the background"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit();
            }}
            maxLength={120}
          />
          <div className="sf-save__row">
            <button
              className="sf-btn sf-btn--ghost"
              onClick={() => {
                setState('idle');
                setNote('');
              }}
            >
              Cancel
            </button>
            <button className="sf-btn sf-btn--primary" onClick={() => void commit()}>
              Save checkpoint
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
