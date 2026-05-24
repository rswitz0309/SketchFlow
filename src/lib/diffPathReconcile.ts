import type { Checkpoint } from '../types';
import type { Stroke } from '../types';
import type { DiffChange, DiffResult } from './diffStrokes';
import { parseStrokesFromSvg } from './serializeSvg';
import {
  MICRO_MOVE_THRESHOLD,
  RELOCATED_SHAPE_THRESHOLD,
  clustersAreSameObject,
  estimateRigidMove,
  pairSameObjectStrokes,
  strokeCentroid,
  strokeGroupsArePairedMove,
  strokeGroupsShareRelocatedObject,
  strokeMatchesSameObject,
  strokeMatchesUnchanged,
  strokeShapeDistance,
  colorsCompatible,
} from './strokeMatching';
import { noteSuggestsRepositioning, moveIntentFromNote } from './checkpointNoteContext';
import { formatMoveIntentDetail, inferMoveIntent } from './moveIntent';

const NET_ZERO_THRESHOLD = 18;
const PATH_SHAPE_THRESHOLD = 16;

export interface DiffPathContext {
  checkpoints: Checkpoint[];
  fromIdx: number;
  toIdx: number;
  /** Optional artist note on the "before" checkpoint (compare left). */
  beforeNote?: string | null;
  /** Optional artist note on the "after" checkpoint (compare right). */
  afterNote?: string | null;
}

export interface ReconcileNotes {
  beforeNote?: string | null;
  afterNote?: string | null;
}

function findShapeMatch(
  stroke: Stroke,
  pool: Stroke[],
  used: Set<number>,
): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < pool.length; i++) {
    if (used.has(i) || pool[i].tool === 'eraser') continue;
    if (!colorsCompatible(stroke, pool[i])) continue;
    if (Math.abs(stroke.size - pool[i].size) > 5) continue;
    const d = strokeShapeDistance(stroke, pool[i]);
    if (d < bestD && d <= PATH_SHAPE_THRESHOLD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Follow a stroke through consecutive saves by shape identity. */
function traceStrokeThroughPath(
  checkpoints: Checkpoint[],
  fromIdx: number,
  toIdx: number,
  startIdx: number,
  startStrokes: Stroke[],
): { netDisplacement: number; endIdx: number; found: boolean } {
  let strokes = startStrokes;
  let idx = startIdx;
  if (idx < 0 || idx >= strokes.length) {
    return { netDisplacement: Infinity, endIdx: -1, found: false };
  }

  const startC = strokeCentroid(strokes[idx]);

  for (let step = fromIdx; step < toIdx; step++) {
    const next = parseStrokesFromSvg(checkpoints[step + 1].svgData) ?? [];
    const used = new Set<number>();
    const j = findShapeMatch(strokes[idx], next, used);
    if (j < 0) return { netDisplacement: Infinity, endIdx: -1, found: false };
    strokes = next;
    idx = j;
  }

  const endC = strokeCentroid(strokes[idx]);
  return {
    netDisplacement: Math.hypot(endC[0] - startC[0], endC[1] - startC[1]),
    endIdx: idx,
    found: true,
  };
}

function strokesForChange(c: DiffChange): Stroke[] {
  return c.memberStrokes ?? c.beforeMemberStrokes ?? [];
}

/** Net displacement along intermediate saves is ~zero (moved away and back). */
function pathNetDisplacementNearZero(
  checkpoints: Checkpoint[],
  fromIdx: number,
  toIdx: number,
  beforeStrokes: Stroke[],
  afterStrokes: Stroke[],
): boolean {
  if (toIdx - fromIdx <= 1) return false;

  const startSvg = parseStrokesFromSvg(checkpoints[fromIdx].svgData) ?? [];
  const endSvg = parseStrokesFromSvg(checkpoints[toIdx].svgData) ?? [];

  const seeds = [...beforeStrokes, ...afterStrokes].filter((s) => s.tool !== 'eraser');

  for (const seed of seeds) {
    const bi = findShapeMatch(seed, startSvg, new Set());
    if (bi < 0) continue;
    const trace = traceStrokeThroughPath(checkpoints, fromIdx, toIdx, bi, startSvg);
    if (!trace.found || trace.netDisplacement > NET_ZERO_THRESHOLD) continue;

    const endStroke = endSvg[trace.endIdx];
    for (const as of afterStrokes) {
      if (as.tool === 'eraser') continue;
      if (strokeMatchesSameObject(endStroke, as) || strokeMatchesUnchanged(endStroke, as)) {
        return true;
      }
    }
    for (const bs of beforeStrokes) {
      if (bs.tool === 'eraser') continue;
      if (strokeMatchesSameObject(endStroke, bs) || strokeMatchesUnchanged(endStroke, bs)) {
        return true;
      }
    }
  }
  return false;
}

/** Cancel false add+rem pairs; optionally replace with a single move. */
function cancelOpposingAddRem(
  changes: DiffChange[],
  checkpoints: Checkpoint[],
  fromIdx: number,
  toIdx: number,
  beforeAll: Stroke[],
  afterAll: Stroke[],
  notes?: ReconcileNotes,
): { removeIds: Set<string>; replacements: DiffChange[]; extraUnchanged: number } {
  const removeIds = new Set<string>();
  const replacements: DiffChange[] = [];
  let extraUnchanged = 0;

  const adds = changes.filter((c) => c.kind === 'add');
  const rems = changes.filter((c) => c.kind === 'rem');

  for (const add of adds) {
    if (removeIds.has(add.id)) continue;
    const addStrokes = add.memberStrokes ?? [];

    for (const rem of rems) {
      if (removeIds.has(rem.id)) continue;
      const remStrokes = rem.beforeMemberStrokes ?? [];
      if (remStrokes.length === 0 || addStrokes.length === 0) continue;

      const noteBias = noteSuggestsRepositioning(notes?.afterNote ?? notes?.beforeNote);
      const clusterRelocated = clustersAreSameObject(remStrokes, addStrokes)
        ? estimateRigidMove(
            remStrokes,
            addStrokes,
            10,
            RELOCATED_SHAPE_THRESHOLD,
          )
        : null;
      const pairedMove =
        strokeGroupsArePairedMove(remStrokes, addStrokes) ??
        strokeGroupsShareRelocatedObject(remStrokes, addStrokes) ??
        (clusterRelocated && clusterRelocated.confidence >= 0.24
          ? clusterRelocated
          : null);
      if (!pairedMove) continue;

      const move = pairedMove;
      const meaningfulMove =
        move.isMove ||
        move.displacement >= MICRO_MOVE_THRESHOLD ||
        noteBias;
      if (!meaningfulMove) continue;

      const roundTrip =
        pathNetDisplacementNearZero(
          checkpoints,
          fromIdx,
          toIdx,
          remStrokes,
          addStrokes,
        ) ||
        pathNetDisplacementNearZero(
          checkpoints,
          fromIdx,
          toIdx,
          beforeAll,
          afterAll,
        );

      const endpointNear =
        remStrokes.some((rs) =>
          addStrokes.some((as) => strokeMatchesUnchanged(rs, as)),
        ) ||
        move.displacement < NET_ZERO_THRESHOLD ||
        move.displacement < MICRO_MOVE_THRESHOLD;

      removeIds.add(add.id);
      removeIds.add(rem.id);

      if (roundTrip || endpointNear) {
        extraUnchanged += addStrokes.filter((s) => s.tool !== 'eraser').length;
        break;
      }

      if (move.isMove || noteBias || move.displacement >= MICRO_MOVE_THRESHOLD) {
        const geometryIntent = inferMoveIntent(
          rem.bounds,
          add.bounds,
          remStrokes,
          addStrokes,
          afterAll,
        );
        const intent = moveIntentFromNote(notes?.afterNote, geometryIntent);
        replacements.push({
          ...add,
          id: `comp-mov-path-${rem.id}-${add.id}`,
          kind: 'mov',
          summary: `moved object · ${add.componentLabel}`,
          detail: formatMoveIntentDetail(
            `${Math.round(move.displacement)}px repositioned`,
            intent,
          ),
          bounds: add.bounds,
          beforeBounds: rem.bounds,
          memberStrokes: addStrokes,
          beforeMemberStrokes: remStrokes,
        });
        break;
      }
    }
  }

  return { removeIds, replacements, extraUnchanged };
}

/** Merge false add/remove pairs into moves (works for any save span). */
export function reconcileOpposingAddRem(
  result: DiffResult,
  notes?: ReconcileNotes,
): DiffResult {
  const { removeIds, replacements, extraUnchanged } = cancelOpposingAddRem(
    result.changes,
    [],
    0,
    0,
    result.beforeStrokes,
    result.afterStrokes,
    notes,
  );

  return {
    ...result,
    changes: [
      ...result.changes.filter((c) => !removeIds.has(c.id)),
      ...replacements,
    ],
    unchangedCount: result.unchangedCount + extraUnchanged,
  };
}

function cancelChangesForPathUnchangedStrokes(
  changes: DiffChange[],
  checkpoints: Checkpoint[],
  fromIdx: number,
  toIdx: number,
  before: Stroke[],
  after: Stroke[],
  alreadyUnchangedBefore: Set<number>,
  alreadyUnchangedAfter: Set<number>,
): { removeIds: Set<string>; extraUnchanged: number } {
  const removeIds = new Set<string>();
  let extraUnchanged = 0;

  const sameObject = pairSameObjectStrokes(before, after);

  for (const { bi, ai, displacement } of sameObject.pairs) {
    if (alreadyUnchangedBefore.has(bi) || alreadyUnchangedAfter.has(ai)) continue;

    if (displacement <= NET_ZERO_THRESHOLD) {
      extraUnchanged++;
      markChangesForStrokePair(changes, before[bi], after[ai], removeIds);
      continue;
    }

    if (
      pathNetDisplacementNearZero(checkpoints, fromIdx, toIdx, [before[bi]], [after[ai]])
    ) {
      extraUnchanged++;
      markChangesForStrokePair(changes, before[bi], after[ai], removeIds);
    }
  }

  return { removeIds, extraUnchanged };
}

function markChangesForStrokePair(
  changes: DiffChange[],
  beforeStroke: Stroke,
  afterStroke: Stroke,
  removeIds: Set<string>,
): void {
  for (const c of changes) {
    const strokes = strokesForChange(c);
    for (const s of strokes) {
      if (
        strokeMatchesSameObject(s, beforeStroke) ||
        strokeMatchesSameObject(s, afterStroke) ||
        strokeMatchesUnchanged(s, beforeStroke) ||
        strokeMatchesUnchanged(s, afterStroke)
      ) {
        removeIds.add(c.id);
        break;
      }
    }
  }
}

/** Use intermediate saves to suppress false adds/removes from round-trip moves. */
export function reconcileDiffWithPath(
  result: DiffResult,
  path: DiffPathContext,
): DiffResult {
  const { checkpoints, fromIdx, toIdx } = path;
  if (toIdx - fromIdx <= 1) return result;

  const { beforeStrokes, afterStrokes } = result;
  const pathUnchanged = pairSameObjectStrokes(beforeStrokes, afterStrokes);

  let removeIds = new Set<string>();
  let extraUnchanged = 0;

  const strokeCancel = cancelChangesForPathUnchangedStrokes(
    result.changes,
    checkpoints,
    fromIdx,
    toIdx,
    beforeStrokes,
    afterStrokes,
    pathUnchanged.matchedBefore,
    pathUnchanged.matchedAfter,
  );
  strokeCancel.removeIds.forEach((id) => removeIds.add(id));
  extraUnchanged += strokeCancel.extraUnchanged;

  let changes = result.changes.filter((c) => !removeIds.has(c.id));

  const { removeIds: addRemIds, replacements, extraUnchanged: addRemExtra } =
    cancelOpposingAddRem(
      changes,
      checkpoints,
      fromIdx,
      toIdx,
      beforeStrokes,
      afterStrokes,
      {
        beforeNote: path.beforeNote,
        afterNote: path.afterNote,
      },
    );
  addRemIds.forEach((id) => removeIds.add(id));
  changes = [...changes.filter((c) => !addRemIds.has(c.id)), ...replacements];
  extraUnchanged += addRemExtra;

  return {
    ...result,
    changes,
    unchangedCount: result.unchangedCount + extraUnchanged,
  };
}
