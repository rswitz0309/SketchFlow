import type { Checkpoint } from '../types';
import type { Stroke } from '../types';
import { diffSvgComponents } from './diffComponents';
import type { Bounds, ChangeKind, DiffChange } from './diffStrokes';
import { inferShapeHint, isGenericLabel } from './shapeHints';

export interface IdentityHint {
  suggestedLabel: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface TrackedObject {
  trackId: number;
  bounds: Bounds;
  noteLabels: string[];
  shapeHints: string[];
  regions: string[];
  kinds: ChangeKind[];
}

function boundsIoU(a: Bounds, b: Bounds): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return inter / Math.max(union, 1);
}

function centroid(b: Bounds): [number, number] {
  return [b.x + b.w / 2, b.y + b.h / 2];
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function mergeBounds(a: Bounds, b: Bounds): Bounds {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function labelFromSaveNote(note: string | null | undefined): string | null {
  const t = note?.trim();
  if (!t || t.length > 60) return null;
  const cleaned = t.replace(/^(add(ed)?|drew|sketch(ed)?|fix(ed)?|update(d)?)\s+/i, '').trim();
  return cleaned.length > 0 ? cleaned : t;
}

function matchTrack(tracks: TrackedObject[], bounds: Bounds): TrackedObject | null {
  let best: TrackedObject | null = null;
  let bestScore = 0;
  const c = centroid(bounds);
  for (const t of tracks) {
    const iou = boundsIoU(t.bounds, bounds);
    const d = dist(centroid(t.bounds), c);
    const score = iou * 2 + (d < 140 ? 0.4 : 0);
    if (score > bestScore && (iou >= 0.08 || d < 100)) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function strokesForChange(c: DiffChange): Stroke[] {
  return c.memberStrokes ?? c.beforeMemberStrokes ?? [];
}

function pickTrackLabel(track: TrackedObject): string | null {
  for (const n of track.noteLabels) {
    if (!isGenericLabel(n)) return n;
  }
  for (const h of track.shapeHints) {
    if (h && !isGenericLabel(h)) return h;
  }
  return null;
}

/**
 * Walk consecutive saves between compared endpoints and track spatial object identity.
 */
export function buildObjectTracks(
  checkpoints: Checkpoint[],
  before: Checkpoint,
  after: Checkpoint,
): TrackedObject[] {
  const fromIdx = checkpoints.findIndex((c) => c.id === before.id);
  const toIdx = checkpoints.findIndex((c) => c.id === after.id);
  if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return [];

  const tracks: TrackedObject[] = [];
  let nextId = 1;

  for (let i = fromIdx; i < toIdx; i++) {
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    const noteLabel = labelFromSaveNote(b.note) ?? labelFromSaveNote(a.note);
    const result = diffSvgComponents(a.svgData, b.svgData);

    for (const c of result.changes) {
      const bounds = c.bounds;
      const strokes = strokesForChange(c);
      const shape = inferShapeHint(strokes, bounds);

      let track = matchTrack(tracks, bounds);
      if (!track) {
        track = {
          trackId: nextId++,
          bounds,
          noteLabels: [],
          shapeHints: [],
          regions: [],
          kinds: [],
        };
        tracks.push(track);
      } else {
        track.bounds = mergeBounds(track.bounds, bounds);
      }

      if (noteLabel) track.noteLabels.push(noteLabel);
      if (shape) track.shapeHints.push(shape);
      track.regions.push(c.componentLabel);
      track.kinds.push(c.kind);
    }
  }

  return tracks;
}

export function buildIdentityHints(
  checkpoints: Checkpoint[],
  before: Checkpoint,
  after: Checkpoint,
  finalChanges: DiffChange[],
): Map<string, IdentityHint> {
  const hints = new Map<string, IdentityHint>();
  const tracks = buildObjectTracks(checkpoints, before, after);

  const afterNote = labelFromSaveNote(after.note);
  const beforeNote = labelFromSaveNote(before.note);

  for (const c of finalChanges) {
    const strokes = strokesForChange(c);
    const shape = inferShapeHint(strokes, c.bounds);
    const track = matchTrack(tracks, c.bounds);
    const trackLabel = track ? pickTrackLabel(track) : null;

    let suggested: string | null = null;
    let confidence: IdentityHint['confidence'] = 'low';
    let reason = 'Inferred from canvas region';

    if (trackLabel) {
      suggested = trackLabel;
      confidence = 'high';
      reason = `Tracked across ${track!.kinds.length} intermediate save step(s)`;
    } else if (afterNote && c.kind === 'add') {
      suggested = afterNote;
      confidence = 'medium';
      reason = `After save note: "${after.note?.trim()}"`;
    } else if (beforeNote && c.kind === 'rem') {
      suggested = beforeNote;
      confidence = 'medium';
      reason = `Before save note: "${before.note?.trim()}"`;
    } else if (shape) {
      suggested = shape;
      confidence = 'medium';
      reason = 'Stroke shape (elongation / size)';
    }

    if (!suggested || isGenericLabel(suggested)) {
      suggested = c.componentLabel;
      confidence = 'low';
    }

    hints.set(c.id, {
      suggestedLabel: suggested,
      confidence,
      reason,
    });
  }

  return hints;
}

export function formatIdentityHintsForPrompt(
  changes: DiffChange[],
  hints: Map<string, IdentityHint>,
): string {
  const lines = changes.map((c, i) => {
    const h = hints.get(c.id);
    if (!h) return `${i + 1}. id=${c.id}: (no identity hint)`;
    return `${i + 1}. id=${c.id}: use label "${h.suggestedLabel}" (${h.confidence} confidence — ${h.reason})`;
  });
  return [
    'Required labeling (from timeline + geometry — prefer these over generic names):',
    ...lines,
    '',
    'Do NOT use generic labels like "object", "shape", "element", "random object", or "visual element".',
    'If a save note says "legs", label leg-like strokes as Legs, not "random object".',
  ].join('\n');
}
