import { useEffect, useRef, useState } from 'react';
import type { Stroke } from '../types';
import { sanitizeDrawableStrokes } from '../lib/strokeErase';

const KEY = (projectId: string) => `sketchflow:project:${projectId}:working`;

export function loadAutosave(projectId: string): Stroke[] | null {
  try {
    const raw = localStorage.getItem(KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return sanitizeDrawableStrokes(parsed as Stroke[]);
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

export function saveAutosave(projectId: string, strokes: Stroke[]): void {
  try {
    localStorage.setItem(KEY(projectId), JSON.stringify(sanitizeDrawableStrokes(strokes)));
  } catch (e) {
    console.warn('Autosave failed', e);
  }
}

export function useAutosave(
  projectId: string,
  strokes: Stroke[],
  options: { debounceMs?: number; enabled?: boolean } = {},
): { lastSavedAt: number | null } {
  const { debounceMs = 400, enabled = true } = options;
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    firstRun.current = true;
  }, [projectId]);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY(projectId), JSON.stringify(sanitizeDrawableStrokes(strokes)));
        setLastSavedAt(Date.now());
      } catch (e) {
        console.warn('Autosave failed', e);
      }
    }, debounceMs);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [projectId, strokes, debounceMs, enabled]);

  return { lastSavedAt };
}
