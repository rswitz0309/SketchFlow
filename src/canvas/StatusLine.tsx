import { useEffect, useState } from 'react';
import { relativeTime } from '../lib/time';
import './StatusLine.css';

export interface StatusLineProps {
  lastCheckpointAt: string | null;
  isDirty: boolean;
}

export default function StatusLine({ lastCheckpointAt, isDirty }: StatusLineProps) {
  const [, force] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  let label: string;
  let mode: 'dirty' | 'clean' | 'empty';

  if (isDirty) {
    label = 'Unsaved changes';
    mode = 'dirty';
  } else if (lastCheckpointAt) {
    label = `Last saved ${relativeTime(lastCheckpointAt)}`;
    mode = 'clean';
  } else {
    label = 'Start drawing — your first checkpoint awaits';
    mode = 'empty';
  }

  return (
    <div className={`sf-status sf-status--${mode}`}>
      <span className="sf-status__dot" aria-hidden />
      <span className="sf-status__text">{label}</span>
    </div>
  );
}
