import { useEffect, useRef, useState } from 'react';
import type { Checkpoint } from '../types';
import './Scrubber.css';

export interface ScrubberProps {
  checkpoints: Checkpoint[];
  index: number;
  onIndexChange: (i: number) => void;
}

const STEP_MS = 1100;

export default function Scrubber({
  checkpoints,
  index,
  onIndexChange,
}: ScrubberProps) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const max = Math.max(0, checkpoints.length - 1);
  const safeIndex = Math.min(Math.max(0, index), max);

  useEffect(() => {
    if (!playing) {
      if (timer.current) window.clearInterval(timer.current);
      return;
    }
    timer.current = window.setInterval(() => {
      onIndexChange(
        // wrap: if at end, stop
        safeIndex >= max ? max : safeIndex + 1,
      );
    }, STEP_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // Effect re-runs when index changes (intentional — keeps interval honest).
  }, [playing, safeIndex, max, onIndexChange]);

  useEffect(() => {
    if (playing && safeIndex >= max) {
      setPlaying(false);
    }
  }, [playing, safeIndex, max]);

  if (checkpoints.length === 0) return null;

  return (
    <div className="sf-scrubber">
      <button
        className="sf-scrubber__play"
        onClick={() => {
          if (safeIndex >= max) onIndexChange(0);
          setPlaying((p) => !p);
        }}
        aria-label={playing ? 'Pause' : 'Play timeline'}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5l12 7-12 7V5z" />
          </svg>
        )}
      </button>
      <input
        className="sf-scrubber__range"
        type="range"
        min={0}
        max={max}
        step={1}
        value={safeIndex}
        onChange={(e) => {
          onIndexChange(parseInt(e.target.value, 10));
          if (playing) setPlaying(false);
        }}
        aria-label="Scrub through timeline"
      />
      <span className="sf-scrubber__count">
        {safeIndex + 1} / {checkpoints.length}
      </span>
    </div>
  );
}
