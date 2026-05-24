import type { Checkpoint } from '../types';
import {
  analyzeDiffComponents,
  type ComponentAnalysis,
  type DiffAnalysisContext,
} from './ai';
import { buildComparePathContext } from './comparePathContext';
import { fingerprintDiff } from './diffFingerprint';
import {
  getCachedPairLabels,
  setCachedPairLabels,
} from './diffLabelCache';
import {
  composePathLabels,
  formatPathComposedPrompt,
} from './pathLabelCompose';
import { reconcileDiffLabels } from './reconcileDiffLabels';
import type { DiffChange } from './diffStrokes';

export interface ConsistentLabelArgs {
  projectId: string;
  changes: DiffChange[];
  before: Checkpoint;
  after: Checkpoint;
  checkpoints: Checkpoint[];
  ctx?: DiffAnalysisContext;
}

/**
 * Labeling pipeline: detection is already done. AI runs once; path thread + cache
 * reconcile names so distant compares stay consistent with earlier pairs.
 */
export async function analyzeDiffComponentsConsistent(
  args: ConsistentLabelArgs,
): Promise<ComponentAnalysis[]> {
  const { projectId, changes, before, after, checkpoints, ctx = {} } = args;
  if (changes.length === 0) return [];

  const fingerprint = fingerprintDiff(changes);
  const cached = getCachedPairLabels(
    projectId,
    before.id,
    after.id,
    fingerprint,
  );

  const pathHints = composePathLabels(
    projectId,
    checkpoints,
    before,
    after,
    changes,
  );

  const fromIdx = checkpoints.findIndex((c) => c.id === before.id);
  const toIdx = checkpoints.findIndex((c) => c.id === after.id);
  const stepsApart = toIdx > fromIdx ? toIdx - fromIdx : 0;

  const pathPrior = formatPathComposedPrompt(pathHints);
  const verbosePath =
    stepsApart > 0 && stepsApart <= 3
      ? buildComparePathContext(checkpoints, before, after)
      : '';
  const pathContext = [verbosePath, pathPrior]
    .filter(Boolean)
    .join('\n\n');

  const fresh = await analyzeDiffComponents(changes, before, after, {
    ...ctx,
    pathContext,
  });

  const reconciled = reconcileDiffLabels({
    changes,
    fresh,
    pathHints,
    cached,
    identityHints: ctx.identityHints,
  });

  setCachedPairLabels(projectId, before.id, after.id, fingerprint, reconciled);
  return reconciled;
}
