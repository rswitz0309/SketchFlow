import { useCallback, useRef, useState } from 'react';
import type { Stroke } from '../types';
import { translateStroke } from '../lib/strokeHitTest';

const MAX_HISTORY = 200;

type UndoAction =
  | { type: 'add'; stroke: Stroke }
  | { type: 'move'; changes: { index: number; before: Stroke; after: Stroke }[] }
  | { type: 'clear'; strokes: Stroke[] };

export interface DrawingHistory {
  strokes: Stroke[];
  addStroke: (s: Stroke) => void;
  moveStroke: (index: number, dx: number, dy: number) => void;
  moveStrokes: (indices: number[], dx: number, dy: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (s: Stroke[]) => void;
  clear: () => void;
}

export function useDrawingHistory(initial: Stroke[] = []): DrawingHistory {
  const [strokes, setStrokes] = useState<Stroke[]>(initial);
  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);
  const [stackTick, setStackTick] = useState(0);

  const bumpStack = useCallback(() => setStackTick((t) => t + 1), []);

  const addStroke = useCallback(
    (s: Stroke) => {
      redoStack.current = [];
      bumpStack();
      undoStack.current.push({ type: 'add', stroke: s });
      setStrokes((prev) => {
        const next = prev.concat(s);
        if (next.length > MAX_HISTORY) {
          return next.slice(next.length - MAX_HISTORY);
        }
        return next;
      });
    },
    [bumpStack],
  );

  const moveStrokes = useCallback(
    (indices: number[], dx: number, dy: number) => {
      if (indices.length === 0 || (dx === 0 && dy === 0)) return;
      redoStack.current = [];
      bumpStack();
      setStrokes((prev) => {
        const indexSet = new Set(indices);
        const changes: { index: number; before: Stroke; after: Stroke }[] = [];
        const next = prev.map((stroke, index) => {
          if (!indexSet.has(index)) return stroke;
          const after = translateStroke(stroke, dx, dy);
          changes.push({ index, before: stroke, after });
          return after;
        });
        if (changes.length > 0) {
          undoStack.current.push({ type: 'move', changes });
        }
        return next;
      });
    },
    [bumpStack],
  );

  const moveStroke = useCallback(
    (index: number, dx: number, dy: number) => {
      moveStrokes([index], dx, dy);
    },
    [moveStrokes],
  );

  const undo = useCallback(() => {
    const action = undoStack.current.pop();
    if (!action) return;
    redoStack.current.push(action);
    bumpStack();
    setStrokes((prev) => {
      if (action.type === 'add') return prev.slice(0, -1);
      if (action.type === 'clear') return action.strokes;
      const next = prev.slice();
      for (const { index, before } of action.changes) {
        next[index] = before;
      }
      return next;
    });
  }, [bumpStack]);

  const redo = useCallback(() => {
    const action = redoStack.current.pop();
    if (!action) return;
    undoStack.current.push(action);
    bumpStack();
    setStrokes((prev) => {
      if (action.type === 'add') return prev.concat(action.stroke);
      if (action.type === 'clear') return [];
      const next = prev.slice();
      for (const { index, after } of action.changes) {
        next[index] = after;
      }
      return next;
    });
  }, [bumpStack]);

  const reset = useCallback(
    (s: Stroke[]) => {
      undoStack.current = [];
      redoStack.current = [];
      bumpStack();
      setStrokes(s);
    },
    [bumpStack],
  );

  const clear = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length > 0) {
        redoStack.current = [];
        undoStack.current.push({ type: 'clear', strokes: prev });
        bumpStack();
      }
      return [];
    });
  }, [bumpStack]);

  return {
    strokes,
    addStroke,
    moveStroke,
    moveStrokes,
    undo,
    redo,
    canUndo: stackTick >= 0 && undoStack.current.length > 0,
    canRedo: stackTick >= 0 && redoStack.current.length > 0,
    reset,
    clear,
  };
}
