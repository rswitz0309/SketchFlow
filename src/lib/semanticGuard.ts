import type { DiffChange } from './diffStrokes';
import type { IdentityHint } from './objectTracking';
import { isGenericLabel } from './shapeHints';

function labelTokens(label: string): Set<string> {
  return new Set(
    label
      .toLowerCase()
      .split(/[\s,;·\-/]+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 2),
  );
}

/** True when two labels plausibly refer to the same thing. */
export function labelsAlign(a: string, b: string): boolean {
  const ta = labelTokens(a);
  const tb = labelTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  for (const t of ta) {
    if (tb.has(t)) return true;
  }
  return false;
}

/** Collect artist save notes along the compared span (any subject matter). */
export function collectPathSaveNotes(
  ...notes: (string | null | undefined)[]
): string[] {
  const out: string[] = [];
  for (const raw of notes) {
    const t = raw?.trim();
    if (!t || t.length > 80 || isGenericLabel(t)) continue;
    out.push(t);
  }
  return [...new Set(out)];
}

/**
 * Prefer timeline-derived identity when the model returns a generic or
 * unrelated label. No hardcoded object classes — only confidence + alignment.
 */
export function guardSemanticLabel(
  aiLabel: string | undefined,
  fallback: string,
  _change: DiffChange,
  hint?: IdentityHint,
): string {
  const candidate = aiLabel?.trim() ?? '';
  const hintLabel = hint?.suggestedLabel?.trim() ?? '';
  const safeFallback = isGenericLabel(fallback)
    ? hintLabel || fallback
    : fallback;

  const preferHint =
    hintLabel &&
    !isGenericLabel(hintLabel) &&
    (hint?.confidence === 'high' || hint?.confidence === 'medium');

  if (preferHint && hint.fromSaveNote && hint.confidence === 'high') {
    if (!candidate || isGenericLabel(candidate)) return hintLabel;
    if (!labelsAlign(candidate, hintLabel)) return hintLabel;
  }

  if (preferHint && hint.fromSaveNote && hint.fromRecentStep) {
    if (!candidate || isGenericLabel(candidate)) return hintLabel;
    if (!labelsAlign(candidate, hintLabel)) return hintLabel;
  }

  if (preferHint && hint.fromSaveNote && isGenericLabel(candidate)) return hintLabel;

  if (preferHint && !hint.fromSaveNote && isGenericLabel(candidate) && !isGenericLabel(hintLabel)) {
    return hintLabel;
  }

  if (candidate && !isGenericLabel(candidate)) return candidate;
  return safeFallback;
}
