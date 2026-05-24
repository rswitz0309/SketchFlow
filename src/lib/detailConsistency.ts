import type { DiffChange } from './diffStrokes';
import type { PathComposedHint } from './pathLabelCompose';

/** Detection-only line shown in the UI — never replaced by AI/cache. */
export function detectionDetailLine(c: DiffChange): string {
  const parts = [c.summary?.trim(), c.detail?.trim()].filter(Boolean);
  return parts.join(' · ') || c.componentLabel;
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True when prose plausibly describes this detected hunk (kind + region). */
export function descriptionAnchorsDetection(text: string, c: DiffChange): boolean {
  const t = normalizeText(text);
  if (!t || t.length < 8) return false;

  const region = normalizeText(c.componentLabel);
  const detail = normalizeText(c.detail ?? '');
  const summary = normalizeText(c.summary ?? '');

  const kindOk =
    (c.kind === 'add' && /\b(add|new|drew|drawn|appear)\b/.test(t)) ||
    (c.kind === 'rem' && /\b(remov|eras|delet|gone|missing)\b/.test(t)) ||
    (c.kind === 'mov' && /\b(mov|shift|reposition|relocat|translat)\b/.test(t)) ||
    detail.split(' ').some((w) => w.length > 3 && t.includes(w)) ||
    summary.split(' ').some((w) => w.length > 3 && t.includes(w));

  const regionOk =
    region.length < 4 ||
    region.split(' ').some((w) => w.length > 2 && t.includes(w));

  const contradicts =
    (c.kind === 'add' && /\b(remov|eras|delet|gone)\b/.test(t) && !/\b(add|new)\b/.test(t)) ||
    (c.kind === 'rem' && /\b(add|new|appear)\b/.test(t) && !/\b(remov|eras|delet)\b/.test(t));

  return kindOk && regionOk && !contradicts;
}

export function descriptionsAlign(a: string, b: string): boolean {
  const ta = new Set(normalizeText(a).split(' ').filter((w) => w.length > 3));
  const tb = new Set(normalizeText(b).split(' ').filter((w) => w.length > 3));
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const w of ta) {
    if (tb.has(w)) overlap++;
  }
  return overlap >= 2 || overlap >= Math.min(ta.size, tb.size) * 0.35;
}

/** One sentence from detection + optional path facts (no AI). */
export function buildAnchoredDescription(
  c: DiffChange,
  path?: PathComposedHint,
): string {
  const net = detectionDetailLine(c);
  if (!path?.stepFacts.length) return net;

  const facts = path.stepFacts.slice(0, 4).join('; ');
  if (path.stepFacts.length === 1) {
    return `${net} (earlier: ${facts})`;
  }
  return `${net} — across ${path.stepFacts.length} saves: ${facts}`;
}

/** AI sentence is shown only when it adds detail beyond detection. */
export function aiDescriptionAddsValue(ai: string, c: DiffChange): boolean {
  if (!descriptionAnchorsDetection(ai, c)) return false;
  const det = normalizeText(detectionDetailLine(c));
  const aiN = normalizeText(ai);
  if (aiN === det || det.includes(aiN) || aiN.includes(det)) return false;
  return ai.length > det.length + 12;
}
