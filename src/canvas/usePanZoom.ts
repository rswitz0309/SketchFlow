import { useCallback, useRef, useState } from 'react';

export interface PanZoomState {
  scale: number;
  x: number;
  y: number;
}

export function usePanZoom(initial: PanZoomState = { scale: 1, x: 0, y: 0 }) {
  const [transform, setTransform] = useState(initial);
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform((t) => {
      const nextScale = Math.min(2.5, Math.max(0.35, t.scale * factor));
      const ratio = nextScale / t.scale;
      return {
        scale: nextScale,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, x: transform.x, y: transform.y };
  }, [transform.x, transform.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setTransform((t) => ({
      ...t,
      x: d.x + (e.clientX - d.px),
      y: d.y + (e.clientY - d.py),
    }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const reset = useCallback((next: PanZoomState) => {
    setTransform(next);
  }, []);

  return {
    transform,
    reset,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
    },
  };
}
