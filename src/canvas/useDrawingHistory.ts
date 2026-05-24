import { useCallback, useRef, useState } from 'react';
import type { Stroke } from '../types';

const MAX_HISTORY = 200;

export interface DrawingHistory {
  strokes: Stroke[];
  addStroke: (s: Stroke) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (s: Stroke[]) => void;
  clear: () => void;
}

export function useDrawingHistory(initial: Stroke[] = []): DrawingHistory {
  const [strokes, setStrokes] = useState<Stroke[]>(initial);
  const redoStack = useRef<Stroke[][]>([]);

  const addStroke = useCallback((s: Stroke) => {
    redoStack.current = [];
    setStrokes((prev) => {
      const next = prev.concat(s);
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      redoStack.current.push([last]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setStrokes((prev) => prev.concat(next));
  }, []);

  const reset = useCallback((s: Stroke[]) => {
    redoStack.current = [];
    setStrokes(s);
  }, []);

  const clear = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length > 0) {
        redoStack.current.push(prev);
      }
      return [];
    });
  }, []);

  return {
    strokes,
    addStroke,
    undo,
    redo,
    canUndo: strokes.length > 0,
    canRedo: redoStack.current.length > 0,
    reset,
    clear,
  };
}
