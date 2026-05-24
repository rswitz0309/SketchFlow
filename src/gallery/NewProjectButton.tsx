import { useEffect, useRef, useState } from 'react';
import './NewProjectButton.css';

export interface NewProjectButtonProps {
  onCreate: (title: string) => Promise<void>;
}

export default function NewProjectButton({ onCreate }: NewProjectButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  async function commit() {
    if (busy) return;
    setBusy(true);
    try {
      await onCreate(title.trim() || 'Untitled sketch');
      setTitle('');
      setOpen(false);
    } catch (e) {
      console.error('Create project failed', e);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        className="sf-new-card"
        onClick={() => setOpen(true)}
        aria-label="New project"
      >
        <span className="sf-new-card__plus" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="sf-new-card__label">New project</span>
        <span className="sf-new-card__hint">A fresh canvas awaits</span>
      </button>
    );
  }

  return (
    <div className="sf-new-card sf-new-card--form">
      <label className="sf-new-card__field-label" htmlFor="sf-new-title">
        Name your sketch
      </label>
      <input
        id="sf-new-title"
        ref={inputRef}
        className="sf-input sf-new-card__input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled sketch"
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit();
          if (e.key === 'Escape') {
            setOpen(false);
            setTitle('');
          }
        }}
        maxLength={80}
        disabled={busy}
      />
      <div className="sf-new-card__row">
        <button
          className="sf-btn sf-btn--ghost"
          onClick={() => {
            setOpen(false);
            setTitle('');
          }}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          className="sf-btn sf-btn--primary"
          onClick={() => void commit()}
          disabled={busy}
        >
          {busy ? 'Creating…' : 'Start drawing'}
        </button>
      </div>
    </div>
  );
}
