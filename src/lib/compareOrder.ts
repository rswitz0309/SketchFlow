import type { Checkpoint } from '../types';

/** Compare slots are always [earlier checkpoint, later checkpoint]. */
export function normalizeCompareIds(
  checkpoints: Checkpoint[],
  ids: [string | null, string | null],
): [string | null, string | null] {
  const [idA, idB] = ids;
  if (!idA || !idB || idA === idB) return ids;

  const cpA = checkpoints.find((c) => c.id === idA);
  const cpB = checkpoints.find((c) => c.id === idB);
  if (!cpA || !cpB) return ids;

  return cpA.createdAt <= cpB.createdAt ? [idA, idB] : [idB, idA];
}

export function orderedCompareCheckpoints(
  checkpoints: Checkpoint[],
  ids: [string | null, string | null],
): [Checkpoint | null, Checkpoint | null] {
  const [beforeId, afterId] = normalizeCompareIds(checkpoints, ids);
  return [
    beforeId ? checkpoints.find((c) => c.id === beforeId) ?? null : null,
    afterId ? checkpoints.find((c) => c.id === afterId) ?? null : null,
  ];
}
