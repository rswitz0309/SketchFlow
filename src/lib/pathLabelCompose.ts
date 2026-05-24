import type { Checkpoint } from '../types';
import type { ComponentAnalysis } from './ai';
import { diffSvgComponents } from './diffComponents';
import { getCachedPairLabelsLoose } from './diffLabelCache';
import { fingerprintDiff } from './diffFingerprint';
import type { Bounds, DiffChange } from './diffStrokes';
import { checkpointDisplayName } from './comparePathContext';
import { isGenericLabel } from './shapeHints';

export interface PathComposedHint {
  suggestedLabel: string;
  /** Detection-only facts from intermediate saves (not AI prose). */
  stepFacts: string[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
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

function changeBounds(c: DiffChange): Bounds {
  if (c.beforeBounds) {
    const b = c.bounds;
    const bb = c.beforeBounds;
    return {
      x: Math.min(b.x, bb.x),
      y: Math.min(b.y, bb.y),
      w: Math.max(b.x + b.w, bb.x + bb.w) - Math.min(b.x, bb.x),
      h: Math.max(b.y + b.h, bb.y + bb.h) - Math.min(b.y, bb.y),
    };
  }
  return c.bounds;
}

interface StepLabel {
  bounds: Bounds;
  label: string;
  fact: string;
  kind: DiffChange['kind'];
  stepLabel: string;
  fromCache: boolean;
}

function stepFactFromChange(c: DiffChange): string {
  const parts = [c.summary?.trim(), c.detail?.trim()].filter(Boolean);
  return parts.join(' · ') || c.componentLabel;
}

function analysesToStepLabels(
  analyses: ComponentAnalysis[],
  stepChanges: DiffChange[],
  stepName: string,
  fromCache: boolean,
): StepLabel[] {
  const byId = new Map(analyses.map((a) => [a.id, a]));
  return stepChanges.map((c) => {
    const a = byId.get(c.id);
    const label =
      a?.label && !isGenericLabel(a.label) ? a.label : c.componentLabel;
    return {
      bounds: changeBounds(c),
      label,
      fact: stepFactFromChange(c),
      kind: c.kind,
      stepLabel: stepName,
      fromCache,
    };
  });
}

/**
 * Build per-endpoint-change naming hints from cached adjacent compares and
 * detection-only step diffs (no extra API). Does not alter detection.
 */
export function composePathLabels(
  projectId: string,
  checkpoints: Checkpoint[],
  before: Checkpoint,
  after: Checkpoint,
  endpointChanges: DiffChange[],
): Map<string, PathComposedHint> {
  const out = new Map<string, PathComposedHint>();
  const fromIdx = checkpoints.findIndex((c) => c.id === before.id);
  const toIdx = checkpoints.findIndex((c) => c.id === after.id);
  if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return out;

  const stepLabels: StepLabel[] = [];

  for (let i = fromIdx; i < toIdx; i++) {
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    const stepName = `${checkpointDisplayName(a, i)} → ${checkpointDisplayName(b, i + 1)}`;
    const stepDiff = diffSvgComponents(a.svgData, b.svgData);

    const stepFp = fingerprintDiff(stepDiff.changes);
    const cached = getCachedPairLabelsLoose(projectId, a.id, b.id);
    if (
      cached &&
      cached.fingerprint === stepFp &&
      cached.analyses.length > 0
    ) {
      stepLabels.push(
        ...analysesToStepLabels(cached.analyses, stepDiff.changes, stepName, true),
      );
    } else {
      for (const c of stepDiff.changes) {
        if (isGenericLabel(c.componentLabel)) continue;
        stepLabels.push({
          bounds: changeBounds(c),
          label: c.componentLabel,
          fact: stepFactFromChange(c),
          kind: c.kind,
          stepLabel: stepName,
          fromCache: false,
        });
      }
    }
  }

  if (stepLabels.length === 0) return out;

  for (const end of endpointChanges) {
    const eb = changeBounds(end);
    const matches: { sl: StepLabel; score: number }[] = [];

    for (const sl of stepLabels) {
      if (sl.kind !== end.kind && sl.kind !== 'mov' && end.kind !== 'mov') continue;
      const iou = boundsIoU(eb, sl.bounds);
      if (iou < 0.06) continue;
      matches.push({ sl, score: iou + (sl.fromCache ? 0.15 : 0) });
    }

    matches.sort((x, y) => y.score - x.score);
    const top = matches.slice(0, 4);
    if (top.length === 0) continue;

    const labels = [...new Set(top.map((m) => m.sl.label))];
    const primary = top[0].sl;
    const sameName = labels.length === 1;

    const stepFacts = top.map((m) => `${m.sl.stepLabel}: ${m.sl.fact}`);

    out.set(end.id, {
      suggestedLabel: primary.label,
      stepFacts,
      confidence: sameName && primary.fromCache ? 'high' : sameName ? 'medium' : 'low',
      reason: top
        .map((m) => `${m.sl.label} (${m.sl.stepLabel})`)
        .slice(0, 3)
        .join('; '),
    });
  }

  return out;
}

export function formatPathComposedPrompt(hints: Map<string, PathComposedHint>): string {
  if (hints.size === 0) return '';
  const nameLines = [...hints.entries()].map(
    ([id, h]) =>
      `- id=${id}: prefer name "${h.suggestedLabel}" (${h.confidence} confidence)`,
  );
  const factLines = [...hints.entries()]
    .filter(([, h]) => h.stepFacts.length > 0)
    .map(([id, h]) => `- id=${id} intermediate detection facts: ${h.stepFacts.join(' | ')}`);

  return [
    'Timeline naming thread (labels only — do not copy intermediate facts into your description unless they match the final diff):',
    ...nameLines,
    ...(factLines.length > 0 ? ['', 'Intermediate steps (context only):', ...factLines] : []),
    'Describe the NET change between the two endpoint images for each listed id.',
  ].join('\n');
}
