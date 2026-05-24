import { useEffect, useRef, useState } from 'react';
import type { Stroke } from '../types';

const KEY = (projectId: string) => `sketchflow:project:${projectId}:working`;

export function loadAutosave(projectId: string): Stroke[] | null {
  try {
    const raw = localStorage.getItem(KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Stroke[];
  } catch {
    return null;
  }
}

export function clearAutosave(projectId: string): void {
  try {
    localStorage.removeItem(KEY(projectId));
  } catch {
    /* noop */
  }
}

export function useAutosave(
  projectId: string,
  strokes: Stroke[],
  debounceMs = 400,
): { lastSavedAt: number | null } {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY(projectId), JSON.stringify(strokes));
        setLastSavedAt(Date.now());
      } catch (e) {
        console.warn('Autosave failed', e);
      }
    }, debounceMs);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [projectId, strokes, debounceMs]);

  return { lastSavedAt };
}
