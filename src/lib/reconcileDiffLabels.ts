import type { ComponentAnalysis } from './ai';
import {
  aiDescriptionAddsValue,
  buildAnchoredDescription,
  descriptionAnchorsDetection,
  descriptionsAlign,
} from './detailConsistency';
import type { IdentityHint } from './objectTracking';
import { guardSemanticLabel, labelsAlign } from './semanticGuard';
import type { PathComposedHint } from './pathLabelCompose';
import type { DiffChange } from './diffStrokes';
import { inferShapeHint, isGenericLabel } from './shapeHints';

/**
 * Labels + descriptions after detection + AI. Detection summary/detail are never
 * overwritten here — only the optional AI prose field is reconciled.
 */
export function reconcileDiffLabels(args: {
  changes: DiffChange[];
  fresh: ComponentAnalysis[];
  pathHints: Map<string, PathComposedHint>;
  cached: ComponentAnalysis[] | null;
  identityHints?: Map<string, IdentityHint>;
}): ComponentAnalysis[] {
  const { changes, fresh, pathHints, cached, identityHints } = args;
  const freshById = new Map(fresh.map((a) => [a.id, a]));
  const cacheById = new Map((cached ?? []).map((a) => [a.id, a]));

  return changes.map((c) => {
    const ai = freshById.get(c.id);
    const cache = cacheById.get(c.id);
    const path = pathHints.get(c.id);
    const hint = identityHints?.get(c.id);
    const strokes = c.memberStrokes ?? c.beforeMemberStrokes ?? [];
    const shapeFallback = inferShapeHint(strokes, c.bounds) ?? c.componentLabel;
    const fallback = hint?.suggestedLabel ?? shapeFallback;

    const anchored = buildAnchoredDescription(c, path);

    let label =
      ai?.label ??
      path?.suggestedLabel ??
      cache?.label ??
      fallback;

    const pathLabel = path?.suggestedLabel?.trim() ?? '';
    const cacheLabel = cache?.label?.trim() ?? '';
    const aiLabel = ai?.label?.trim() ?? '';

    const pathStrong =
      path &&
      (path.confidence === 'high' ||
        (path.confidence === 'medium' && !isGenericLabel(pathLabel)));

    if (pathStrong && !isGenericLabel(pathLabel)) {
      if (isGenericLabel(aiLabel) || !labelsAlign(aiLabel, pathLabel)) {
        if (!cacheLabel || labelsAlign(cacheLabel, pathLabel) || !labelsAlign(aiLabel, cacheLabel)) {
          label = pathLabel;
        }
      }
      if (labelsAlign(aiLabel, pathLabel)) {
        label = aiLabel;
      }
    }

    if (
      cacheLabel &&
      !isGenericLabel(cacheLabel) &&
      pathLabel &&
      labelsAlign(cacheLabel, pathLabel) &&
      (!aiLabel || labelsAlign(aiLabel, cacheLabel) || isGenericLabel(aiLabel))
    ) {
      label = cacheLabel;
    }

    if (
      cacheLabel &&
      pathStrong &&
      !labelsAlign(cacheLabel, pathLabel) &&
      hint?.fromSaveNote &&
      hint.confidence === 'high'
    ) {
      label = guardSemanticLabel(aiLabel, pathLabel || hint.suggestedLabel, c, hint);
    }

    if (
      cacheLabel &&
      pathStrong &&
      !labelsAlign(cacheLabel, pathLabel) &&
      aiLabel &&
      labelsAlign(aiLabel, pathLabel)
    ) {
      label = aiLabel;
    }

    label = guardSemanticLabel(label, fallback, c, hint);

    let description = anchored;
    const aiDesc = ai?.description?.trim() ?? '';
    const cacheDesc = cache?.description?.trim() ?? '';

    if (aiDesc && descriptionAnchorsDetection(aiDesc, c) && aiDescriptionAddsValue(aiDesc, c)) {
      description = aiDesc;
    } else if (
      cacheDesc &&
      descriptionAnchorsDetection(cacheDesc, c) &&
      descriptionsAlign(cacheDesc, anchored)
    ) {
      description = cacheDesc;
    }

    let beforeDescription = ai?.beforeDescription ?? cache?.beforeDescription;
    let afterDescription = ai?.afterDescription ?? cache?.afterDescription;

    return {
      id: c.id,
      label,
      description,
      beforeDescription,
      afterDescription,
    };
  });
}
