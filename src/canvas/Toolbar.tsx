import { useState } from 'react';
import type { Tool } from '../types';
import { COLOR_SWATCHES, SIZE_OPTIONS } from '../types';
import './Toolbar.css';

export interface ToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  onColorChange: (c: string) => void;
  size: number;
  onSizeChange: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
}

const TOOLS: { id: Tool; label: string; icon: JSX.Element }[] = [
  {
    id: 'pencil',
    label: 'Pencil',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 21l3.5-1 11-11-2.5-2.5-11 11L3 21zM14.5 6.5L17 9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'brush',
    label: 'Brush',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 19c0-3 3-3 3-6s4-3 4-6 4-3 6-1c2 2-1 5-3 6s-1 4-3 5-3 4-7 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Eraser',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 17l7 4 11-11-7-7-11 11 0 3z M9 21l7-7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'select',
    label: 'Select & move (Shift+click for multi)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l2.2 6.8H21l-5.5 4 2.1 6.8L12 16.6 6.4 20.6l2.1-6.8L3 9.8h6.8L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function Toolbar(props: ToolbarProps) {
  const {
    tool,
    onToolChange,
    color,
    onColorChange,
    size,
    onSizeChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onClear,
  } = props;

  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="sf-toolbar">
      <div className="sf-toolbar__group" role="group" aria-label="Tool">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`sf-toolbar__tool ${tool === t.id ? 'is-active' : ''}`}
            onClick={() => onToolChange(t.id)}
            title={t.label}
            aria-label={t.label}
            aria-pressed={tool === t.id}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="sf-toolbar__divider" />

      <div className="sf-toolbar__group" role="group" aria-label="Color">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            className={`sf-toolbar__swatch ${color === c ? 'is-active' : ''}`}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
          />
        ))}
        <label className="sf-toolbar__custom" title="Custom color">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
          <span
            className="sf-toolbar__custom-swatch"
            style={{ background: color }}
          />
        </label>
      </div>

      <div className="sf-toolbar__divider" />

      <div className="sf-toolbar__group" role="group" aria-label="Size">
        {SIZE_OPTIONS.map((s) => (
          <button
            key={s}
            className={`sf-toolbar__size ${size === s ? 'is-active' : ''}`}
            onClick={() => onSizeChange(s)}
            title={`${s}px`}
            aria-label={`Size ${s}`}
            aria-pressed={size === s}
          >
            <span
              className="sf-toolbar__size-dot"
              style={{
                width: Math.min(s, 22),
                height: Math.min(s, 22),
                background: tool === 'eraser' ? 'var(--muted)' : color,
              }}
            />
          </button>
        ))}
      </div>

      <div className="sf-toolbar__spacer" />

      <div className="sf-toolbar__group" role="group" aria-label="History">
        <button
          className="sf-btn sf-btn--ghost sf-btn--icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          aria-label="Undo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="sf-btn sf-btn--ghost sf-btn--icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          aria-label="Redo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {confirmClear ? (
          <>
            <button
              className="sf-btn"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
            <button
              className="sf-btn sf-btn--danger"
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              Clear canvas
            </button>
          </>
        ) : (
          <button
            className="sf-btn sf-btn--ghost"
            onClick={() => setConfirmClear(true)}
            title="Clear canvas"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
