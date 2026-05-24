import type { Checkpoint } from '../types';
import type { Stroke } from '../types';
import { suggestLabelFromChange } from './changeLabels';
import { diffSvgComponents } from './diffComponents';
import type { Bounds, ChangeKind, DiffChange } from './diffStrokes';
import { parseStrokesFromSvg } from './serializeSvg';
import {
  inferSceneKind,
  isSubjectFocalRegion,
  isSubpartScale,
  scenePromptForKind,
  type SceneKind,
} from './sceneContext';
import { collectPathSaveNotes } from './semanticGuard';
import { inferShapeHint, isGenericLabel } from './shapeHints';

export interface IdentityHint {
  suggestedLabel: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  fromRecentStep?: boolean;
  /** True when label comes from a save note (not geometry-only). */
  fromSaveNote?: boolean;
}

interface TrackedObject {
  trackId: number;
  bounds: Bounds;
  shapeHints: string[];
  regions: string[];
  kinds: ChangeKind[];
  /** Checkpoint index (in checkpoints array) when this track was first seen. */
  introducedAtCheckpointIdx: number;
  /** Checkpoint index when this track was last updated. */
  lastTouchedCheckpointIdx: number;
  /** Note on the save that created this track (checkpoint after first diff step). */
  introducingNote: string | null;
  /** Note on the most recent save that touched this track. */
  latestNote: string | null;
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

export function labelFromSaveNote(note: string | null | undefined): string | null {
  const t = note?.trim();
  if (!t || t.length > 80) return null;
  const cleaned = t.replace(/^(add(ed)?|drew|sketch(ed)?|fix(ed)?|update(d)?)\s+/i, '').trim();
  const label = cleaned.length > 0 ? cleaned : t;
  return isGenericLabel(label) ? null : label;
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

/** Only use a track's save note if it was set on a relevant save (not an old unrelated title). */
function pickTrackNote(
  track: TrackedObject,
  afterCheckpointIdx: number,
): string | null {
  if (
    track.latestNote &&
    track.lastTouchedCheckpointIdx >= afterCheckpointIdx - 1
  ) {
    return track.latestNote;
  }
  if (
    track.introducingNote &&
    track.introducedAtCheckpointIdx >= afterCheckpointIdx - 1
  ) {
    return track.introducingNote;
  }
  return null;
}

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
    const stepNote = labelFromSaveNote(b.note);
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
          shapeHints: [],
          regions: [],
          kinds: [],
          introducedAtCheckpointIdx: i + 1,
          lastTouchedCheckpointIdx: i + 1,
          introducingNote: stepNote,
          latestNote: stepNote,
        };
        tracks.push(track);
      } else {
        track.bounds = mergeBounds(track.bounds, bounds);
        track.lastTouchedCheckpointIdx = i + 1;
        if (stepNote) track.latestNote = stepNote;
      }

      if (shape) track.shapeHints.push(shape);
      track.regions.push(c.componentLabel);
      track.kinds.push(c.kind);
    }
  }

  return tracks;
}

function matchChangeInStep(
  stepChanges: DiffChange[],
  bounds: Bounds,
): DiffChange | null {
  let best: DiffChange | null = null;
  let bestIou = 0;
  for (const sc of stepChanges) {
    const iou = boundsIoU(sc.bounds, bounds);
    if (iou > bestIou) {
      bestIou = iou;
      best = sc;
    }
  }
  if (bestIou >= 0.06) return best;
  const c = centroid(bounds);
  for (const sc of stepChanges) {
    if (dist(centroid(sc.bounds), c) < 120) return sc;
  }
  return null;
}

function noteFromIntroducingStep(
  checkpoints: Checkpoint[],
  fromIdx: number,
  toIdx: number,
  bounds: Bounds,
): string | null {
  for (let i = fromIdx; i < toIdx; i++) {
    const stepResult = diffSvgComponents(
      checkpoints[i].svgData,
      checkpoints[i + 1].svgData,
    );
    const hit = matchChangeInStep(stepResult.changes, bounds);
    if (!hit || hit.kind !== 'add') continue;
    const note = labelFromSaveNote(checkpoints[i + 1].note);
    if (note) return note;
  }
  return null;
}

function subpartFallback(c: DiffChange, sceneKind: SceneKind): string | null {
  if (!isSubpartScale(c.bounds)) return null;
  if (sceneKind === 'portrait' && isSubjectFocalRegion(c.bounds)) {
    return 'subject detail';
  }
  if (sceneKind === 'figure') return 'figure detail';
  return 'local detail';
}

export function buildSceneContextPrompt(after: Checkpoint): string | null {
  const strokes = parseStrokesFromSvg(after.svgData) ?? [];
  return scenePromptForKind(inferSceneKind(strokes));
}

export function buildIdentityHints(
  checkpoints: Checkpoint[],
  before: Checkpoint,
  after: Checkpoint,
  finalChanges: DiffChange[],
): Map<string, IdentityHint> {
  const hints = new Map<string, IdentityHint>();
  const fromIdx = checkpoints.findIndex((c) => c.id === before.id);
  const toIdx = checkpoints.findIndex((c) => c.id === after.id);
  const tracks = buildObjectTracks(checkpoints, before, after);

  const afterNote = labelFromSaveNote(after.note);
  const beforeNote = labelFromSaveNote(before.note);
  const afterHasNote = Boolean(after.note?.trim());

  const sceneKind = inferSceneKind(parseStrokesFromSvg(after.svgData) ?? []);

  let recentStepChanges: DiffChange[] = [];
  if (toIdx > 0 && toIdx < checkpoints.length) {
    recentStepChanges = diffSvgComponents(
      checkpoints[toIdx - 1].svgData,
      checkpoints[toIdx].svgData,
    ).changes;
  }

  for (const c of finalChanges) {
    const strokes = strokesForChange(c);
    const shape = inferShapeHint(strokes, c.bounds);
    const track = matchTrack(tracks, c.bounds);
    const trackNote = track ? pickTrackNote(track, toIdx) : null;
    const recentMatch = matchChangeInStep(recentStepChanges, c.bounds);
    const introNote =
      fromIdx >= 0 && toIdx >= 0
        ? noteFromIntroducingStep(checkpoints, fromIdx, toIdx, c.bounds)
        : null;

    let suggested: string | null = null;
    let confidence: IdentityHint['confidence'] = 'low';
    let reason = 'Inferred from this diff';
    let fromRecentStep = false;
    let fromSaveNote = false;

    if (afterNote && recentMatch && c.kind === 'add') {
      suggested = afterNote;
      confidence = 'high';
      fromRecentStep = true;
      fromSaveNote = true;
      reason = `Save note on the compared "after" checkpoint`;
    } else if (afterNote && c.kind === 'add' && recentMatch) {
      suggested = afterNote;
      confidence = 'high';
      fromSaveNote = true;
      reason = `Save note on the compared "after" checkpoint`;
    } else if (introNote && !afterHasNote) {
      suggested = introNote;
      confidence = 'medium';
      fromSaveNote = true;
      reason = 'Save note on the step that first added this region';
    } else if (trackNote && afterHasNote) {
      suggested = trackNote;
      confidence = 'medium';
      fromSaveNote = true;
      reason = 'Save note on a recent step that touched this region';
    } else if (beforeNote && c.kind === 'rem') {
      suggested = beforeNote;
      confidence = 'medium';
      fromSaveNote = true;
      reason = 'Save note on the compared "before" checkpoint';
    } else {
      const subpart = subpartFallback(c, sceneKind);
      if (subpart) {
        suggested = subpart;
        reason = 'Small change relative to scene layout';
      } else if (shape) {
        suggested = shape;
        confidence = 'low';
        reason = 'Stroke geometry';
      } else {
        suggested = suggestLabelFromChange(c);
        reason = afterHasNote
          ? 'No matching save note for this region'
          : 'No save note on "after" — use visual diff only';
      }
    }

    if (!suggested || isGenericLabel(suggested)) {
      suggested = suggestLabelFromChange(c);
      confidence = 'low';
      fromSaveNote = false;
    }

    hints.set(c.id, {
      suggestedLabel: suggested,
      confidence,
      reason,
      fromRecentStep,
      fromSaveNote,
    });
  }

  return hints;
}

export function formatIdentityHintsForPrompt(
  changes: DiffChange[],
  hints: Map<string, IdentityHint>,
  afterHasNote: boolean,
): string {
  const lines = changes.map((c, i) => {
    const h = hints.get(c.id);
    if (!h) return `${i + 1}. id=${c.id}: infer label from AFTER image and change geometry`;
    const noteTag = h.fromSaveNote ? ' [from save note]' : ' [from diff geometry]';
    return `${i + 1}. id=${c.id}: suggested "${h.suggestedLabel}" (${h.confidence}${noteTag} — ${h.reason})`;
  });
  return [
    'Identity hints:',
    ...lines,
    '',
    afterHasNote
      ? 'When a hint is marked [from save note] with high confidence, use that label.'
      : 'The "after" checkpoint has NO save note. Do NOT reuse titles from older saves. Label each change from the AFTER image and its geometry only.',
    '- Avoid generic placeholders (object, shape, element, blob).',
  ].join('\n');
}

export function formatPathNotesForPrompt(
  checkpoints: Checkpoint[],
  before: Checkpoint,
  after: Checkpoint,
): string {
  const fromIdx = checkpoints.findIndex((c) => c.id === before.id);
  const toIdx = checkpoints.findIndex((c) => c.id === after.id);
  if (fromIdx < 0 || toIdx < 0) return '';
  const notes = collectPathSaveNotes(
    ...checkpoints.slice(fromIdx, toIdx + 1).map((c) => c.note),
  );
  if (notes.length === 0) return '';
  return `Save notes on earlier checkpoints in this span (do not apply to unrelated regions on the after save unless that note is listed for this change): ${notes.map((n) => `"${n}"`).join(', ')}`;
}
