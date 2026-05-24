import { useEffect, useMemo, useState } from 'react';
import type { Project, Stroke, Tool } from '../types';
import { COLOR_SWATCHES, SIZE_OPTIONS } from '../types';
import {
  getProject,
  listCheckpoints,
  renameProject,
  saveCheckpoint,
} from '../lib/storage';
import { resolveWorkingStrokes } from '../lib/resolveWorkingStrokes';
import { strokesToSvg } from '../lib/serializeSvg';
import { rasterizeSvgToPng } from '../lib/rasterize';
import DrawingSurface from '../canvas/DrawingSurface';
import Toolbar from '../canvas/Toolbar';
import SaveCheckpointButton from '../canvas/SaveCheckpointButton';
import StatusLine from '../canvas/StatusLine';
import { useDrawingHistory } from '../canvas/useDrawingHistory';
import { loadAutosave, saveAutosave, useAutosave } from '../canvas/useAutosave';
import './Canvas.css';

export interface CanvasProps {
  projectId: string;
  onBack: () => void;
  onOpenTimeline: () => void;
}

export default function Canvas({ projectId, onBack, onOpenTimeline }: CanvasProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0]);
  const [size, setSize] = useState<number>(SIZE_OPTIONS[1]);
  const [lastCheckpointAt, setLastCheckpointAt] = useState<string | null>(null);
  const [lastSavedStrokeCount, setLastSavedStrokeCount] = useState<number>(0);
  const [titleDraft, setTitleDraft] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const history = useDrawingHistory([]);

  useEffect(() => {
    let cancelled = false;
    setLoadedKey(null);
    (async () => {
      try {
        const p = await getProject(projectId);
        if (!p) {
          onBack();
          return;
        }
        if (cancelled) return;
        setProject(p);
        setTitleDraft(p.title);

        const cps = await listCheckpoints(projectId);
        if (cancelled) return;

        const latest = cps[cps.length - 1] ?? null;
        setLastCheckpointAt(latest?.createdAt ?? null);

        const autosaved = loadAutosave(projectId);
        const initial = resolveWorkingStrokes(autosaved, latest);
        history.reset(initial);
        if (initial.length > 0 && !(autosaved && autosaved.length > 0)) {
          saveAutosave(projectId, initial);
        }
        setLastSavedStrokeCount(
          autosaved && autosaved.length > 0 ? -1 : initial.length,
        );
        setLoadedKey(projectId);
      } catch (e) {
        console.error('Failed to load project', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useAutosave(projectId, history.strokes, {
    enabled: loadedKey === projectId,
  });

  const isDirty = useMemo(() => {
    if (lastSavedStrokeCount === -1) return history.strokes.length > 0;
    return history.strokes.length !== lastSavedStrokeCount;
  }, [history.strokes.length, lastSavedStrokeCount]);

  async function handleSave(note: string) {
    if (!project) return;
    const svgString = strokesToSvg(history.strokes);
    let thumbnail: string | null = null;
    try {
      thumbnail = await rasterizeSvgToPng(svgString);
    } catch (e) {
      console.warn('Thumbnail rasterize failed', e);
    }
    const cp = await saveCheckpoint({
      projectId: project.id,
      svgData: svgString,
      thumbnailDataUrl: thumbnail,
      note: note || null,
    });
    setLastCheckpointAt(cp.createdAt);
    setLastSavedStrokeCount(history.strokes.length);
  }

  async function handleTitleCommit() {
    if (!project) return;
    const next = titleDraft.trim() || 'Untitled sketch';
    setEditingTitle(false);
    if (next === project.title) return;
    try {
      await renameProject(project.id, next);
      setProject({ ...project, title: next });
    } catch (e) {
      console.error('Rename failed', e);
    }
  }

  const handleStrokeComplete = (s: Stroke) => history.addStroke(s);

  if (!project || loadedKey !== projectId) {
    return (
      <div className="sf-canvas sf-canvas--loading">
        <div className="sf-canvas__loading">Loading sketch…</div>
      </div>
    );
  }

  return (
    <div className="sf-canvas">
      <div className="sf-canvas__chrome">
        <span className="sf-canvas__chrome-dots" aria-hidden>
          <span /><span /><span />
        </span>
        <span>sketchflow · {project.title} · canvas</span>
        <span style={{ marginLeft: 'auto' }}>
          {isDirty ? 'unsaved changes' : lastCheckpointAt ? 'all saved' : 'empty canvas'}
        </span>
      </div>
      <header className="sf-canvas__header">
        <div className="sf-canvas__nav">
          <button
            className="sf-btn sf-btn--ghost"
            onClick={onBack}
            aria-label="Back to gallery"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Gallery</span>
          </button>
          <span className="sf-canvas__sep" aria-hidden>/</span>
          {editingTitle ? (
            <input
              className="sf-input sf-canvas__title-input"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void handleTitleCommit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleTitleCommit();
                if (e.key === 'Escape') {
                  setTitleDraft(project.title);
                  setEditingTitle(false);
                }
              }}
              maxLength={80}
            />
          ) : (
            <button
              className="sf-canvas__title"
              onClick={() => setEditingTitle(true)}
              title="Rename"
            >
              {project.title}
            </button>
          )}
        </div>
        <div className="sf-canvas__actions">
          <StatusLine lastCheckpointAt={lastCheckpointAt} isDirty={isDirty} />
          <button className="sf-btn sf-btn--ghost" onClick={onOpenTimeline}>
            Your timeline
          </button>
          <SaveCheckpointButton onSave={handleSave} disabled={!isDirty && lastCheckpointAt !== null} />
        </div>
      </header>

      <div className="sf-canvas__toolbar-wrap">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onClear={history.clear}
        />
      </div>

      <DrawingSurface
        strokes={history.strokes}
        tool={tool}
        color={color}
        size={size}
        onStrokeComplete={handleStrokeComplete}
        onMoveStrokes={history.moveStrokes}
      />
    </div>
  );
}
