import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { Checkpoint } from '../types';
import type { DiffChange } from './diffStrokes';
import { renderComponentPairCrops } from './componentRender';
import {
  formatIdentityHintsForPrompt,
  type IdentityHint,
} from './objectTracking';
import { buildSceneContextPrompt, formatPathNotesForPrompt } from './objectTracking';
import { guardSemanticLabel } from './semanticGuard';
import { inferShapeHint } from './shapeHints';
import { relativeTime } from './time';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const MAX_VISION_COMPONENTS = 8;

function changeVisualWeight(c: DiffChange): number {
  return c.bounds.w * c.bounds.h;
}

function pickChangesForVision(changes: DiffChange[]): DiffChange[] {
  return [...changes]
    .sort((a, b) => changeVisualWeight(b) - changeVisualWeight(a))
    .slice(0, MAX_VISION_COMPONENTS);
}

function formatBounds(c: DiffChange): string {
  const b = c.bounds;
  return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}`;
}

function mergeAnalyses(
  changes: DiffChange[],
  parsed: ComponentAnalysis[],
  identityHints?: Map<string, IdentityHint>,
): ComponentAnalysis[] {
  const byId = new Map(parsed.map((p) => [p.id, p]));
  const byIndex = parsed;
  return changes.map((c, i) => {
    const hit = byId.get(c.id) ?? byIndex[i];
    const hint = identityHints?.get(c.id);
    const strokes = c.memberStrokes ?? c.beforeMemberStrokes ?? [];
    const shapeFallback = inferShapeHint(strokes, c.bounds) ?? c.componentLabel;
    const fallbackLabel = hint?.suggestedLabel ?? shapeFallback;

    if (hit) {
      return {
        id: c.id,
        label: guardSemanticLabel(hit.label, fallbackLabel, c, hint),
        description: hit.description || localComponentDescription(c),
        beforeDescription: hit.beforeDescription ?? undefined,
        afterDescription: hit.afterDescription ?? undefined,
      };
    }
    return {
      id: c.id,
      label: guardSemanticLabel(undefined, fallbackLabel, c, hint),
      description: localComponentDescription(c),
    };
  });
}

export function hasOpenAiKey(): boolean {
  return typeof OPENAI_KEY === 'string' && OPENAI_KEY.length > 0;
}

export function hasAiKey(): boolean {
  return hasOpenAiKey() || (typeof ANTHROPIC_KEY === 'string' && ANTHROPIC_KEY.length > 0);
}

export interface ComponentAnalysis {
  id: string;
  label: string;
  description: string;
  beforeDescription?: string;
  afterDescription?: string;
}

export interface DiffAnalysisContext {
  /** Step-by-step edits between consecutive saves (for distant comparisons). */
  pathContext?: string;
  /** Per-change labels from timeline tracking + geometry. */
  identityHints?: Map<string, IdentityHint>;
  /** Full timeline for save-note span text. */
  checkpoints?: Checkpoint[];
}

function stripDataUrl(dataUrl: string | null): string | null {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : null;
}

function kindWord(kind: DiffChange['kind']): string {
  switch (kind) {
    case 'add':
      return 'added';
    case 'rem':
      return 'removed';
    case 'mov':
      return 'moved';
  }
}

function buildLocalComponentAnalysis(changes: DiffChange[]): ComponentAnalysis[] {
  return changes.map((c) => ({
    id: c.id,
    label: `${c.componentLabel} ${c.kind}`,
    description: localComponentDescription(c),
    beforeDescription: c.kind !== 'add' ? `A ${c.componentLabel} sketch (${c.detail})` : undefined,
    afterDescription: c.kind !== 'rem' ? `Updated ${c.componentLabel} (${c.detail})` : undefined,
  }));
}

function localComponentDescription(c: DiffChange): string {
  const region = c.componentLabel;
  switch (c.kind) {
    case 'add':
      return `You added a new visual element in the ${region} area.`;
    case 'rem':
      return `You removed a drawn object from the ${region} area.`;
    case 'mov':
      return `You repositioned part of the drawing (${c.detail}).`;
  }
}

function buildLocalDiffSummary(
  changes: DiffChange[],
  before: Checkpoint,
  after: Checkpoint,
): string {
  const n = changes.length;
  if (n === 0) {
    return 'No changes between these checkpoints — the drawing stayed the same.';
  }
  const regions = [...new Set(changes.map((c) => c.componentLabel))].slice(0, 3);
  const regionHint =
    regions.length > 0 ? ` around the ${regions.join(', ')}` : '';
  return `Between your save ${relativeTime(before.createdAt)} and ${relativeTime(after.createdAt)}, ${n} visual object${n === 1 ? '' : 's'} changed${regionHint}. Hover a highlight or pick an item in the list to inspect each one.`;
}

async function buildVisionContent(
  changes: DiffChange[],
  before: Checkpoint,
  after: Checkpoint,
  ctx: DiffAnalysisContext,
): Promise<OpenAI.Chat.Completions.ChatCompletionContentPart[]> {
  const { pathContext, identityHints, checkpoints } = ctx;
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  const beforeFull = stripDataUrl(before.thumbnailDataUrl);
  const afterFull = stripDataUrl(after.thumbnailDataUrl);
  if (beforeFull) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${beforeFull}`, detail: 'high' },
    });
  }
  if (afterFull) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${afterFull}`, detail: 'high' },
    });
  }

  const cropChanges = pickChangesForVision(changes);
  for (const c of cropChanges) {
    const { before: beforeCrop, after: afterCrop } = await renderComponentPairCrops(
      c.beforeMemberStrokes,
      c.memberStrokes,
      c.beforeBounds ?? c.bounds,
      c.bounds,
    );
    if (beforeCrop && c.kind !== 'add') {
      parts.push({
        type: 'image_url',
        image_url: { url: beforeCrop, detail: 'high' },
      });
    }
    if (afterCrop && c.kind !== 'rem') {
      parts.push({
        type: 'image_url',
        image_url: { url: afterCrop, detail: 'high' },
      });
    }
  }

  const beforeNote = before.note?.trim() ? ` ("${before.note.trim()}")` : '';
  const afterNote = after.note?.trim() ? ` ("${after.note.trim()}")` : '';

  const cropIds = new Set(cropChanges.map((c) => c.id));
  const changeLines = changes.map((c, i) => {
    const cropNote = cropIds.has(c.id)
      ? ' [cropped before/after pair follows for this id]'
      : '';
    return `${i + 1}. id=${c.id} | ${kindWord(c.kind)} | region=${c.componentLabel} | ${c.summary} | ${c.detail} | box=${formatBounds(c)}${cropNote}`;
  });

  parts.push({
    type: 'text',
    text: [
      'You analyze hand-drawn sketch diffs using computer vision on raster images.',
      'Change regions were pre-detected with pixel-level before/after comparison — trust the images over guesswork.',
      'The first image(s) are the full BEFORE and AFTER checkpoints (if present).',
      'Additional image pairs are zoomed crops of individual changed objects (before then after when both exist).',
      '',
      'Each listed change is one VISUAL OBJECT — a single stroke or several strokes that read as one thing (a tree, face, arrow, box, etc.). Not the whole canvas.',
      '',
      'Return JSON only — an array with one entry per change id:',
      '{ "id": "<exact id>", "label": "<short object name, e.g. Sun, Roof line, Left eye>",',
      '  "beforeDescription": "<what it looked like before: shape, size, color, position — omit or null if added>",',
      '  "afterDescription": "<what it looks like after: shape, size, color, position — omit or null if removed>",',
      '  "description": "<one friendly sentence to the artist summarizing the change>" }',
      '',
      'Be specific about shape, size, color, and position in the AFTER image.',
      'Only describe changes listed below — never invent strokes or regions that are not in the list.',
      'If something still appears in the AFTER image (even moved or redrawn), do not describe it as removed.',
      'Avoid generic labels: object, shape, element, blob, mark, random.',
      'When identity hints or save notes are provided, treat them as authoritative.',
      'Each line includes pre-detected summary and detail — your description must describe that SAME net change (same kind: add/rem/mov).',
      'Do not describe intermediate saves or unrelated regions. Do not contradict the summary/detail on that line.',
      'For distant comparisons, path context is for naming consistency only — describe what changed between the two endpoint images.',
      'Use the exact id string from each line in your JSON response.',
      '',
      `Before${beforeNote} — ${relativeTime(before.createdAt)}`,
      `After${afterNote} — ${relativeTime(after.createdAt)}`,
      (() => {
        const scene = buildSceneContextPrompt(after);
        return scene ? `\n${scene}\n` : '';
      })(),
      pathContext ? `\n${pathContext}\n` : '',
      checkpoints && checkpoints.length > 0
        ? `\n${formatPathNotesForPrompt(checkpoints, before, after)}\n`
        : '',
      identityHints && identityHints.size > 0
        ? `\n${formatIdentityHintsForPrompt(changes, identityHints, Boolean(after.note?.trim()))}\n`
        : '',
      '',
      'Changes (final diff between the two endpoints above):',
      changeLines.join('\n'),
    ].join('\n'),
  });

  return parts;
}

/** Per-component vision labels + before/after descriptions. */
export async function analyzeDiffComponents(
  changes: DiffChange[],
  before: Checkpoint,
  after: Checkpoint,
  ctx: DiffAnalysisContext = {},
): Promise<ComponentAnalysis[]> {
  if (changes.length === 0) return [];

  if (!hasOpenAiKey()) {
    if (typeof ANTHROPIC_KEY === 'string' && ANTHROPIC_KEY.length > 0) {
      return analyzeDiffComponentsAnthropic(changes, before, after, ctx);
    }
    return mergeAnalyses(changes, buildLocalComponentAnalysis(changes), ctx.identityHints);
  }

  try {
    const client = new OpenAI({
      apiKey: OPENAI_KEY,
      dangerouslyAllowBrowser: true,
    });

    const content = await buildVisionContent(changes, before, after, ctx);

    const msg = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1400,
      messages: [{ role: 'user', content }],
    });

    const text = msg.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ComponentAnalysis[];
      return mergeAnalyses(changes, parsed, ctx.identityHints);
    }
  } catch (err) {
    console.warn('OpenAI component analysis failed, falling back:', err);
  }

  return mergeAnalyses(changes, buildLocalComponentAnalysis(changes), ctx.identityHints);
}

async function analyzeDiffComponentsAnthropic(
  changes: DiffChange[],
  before: Checkpoint,
  after: Checkpoint,
  ctx: DiffAnalysisContext,
): Promise<ComponentAnalysis[]> {
  const { pathContext, identityHints, checkpoints } = ctx;
  try {
    const client = new Anthropic({
      apiKey: ANTHROPIC_KEY,
      dangerouslyAllowBrowser: true,
    });

    const changeLines = changes.map((c, i) => {
      return `${i + 1}. id=${c.id} | ${kindWord(c.kind)} | region=${c.componentLabel} | ${c.summary} | ${c.detail}`;
    });

    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = [];
    const beforeB64 = stripDataUrl(before.thumbnailDataUrl);
    const afterB64 = stripDataUrl(after.thumbnailDataUrl);
    if (beforeB64 && afterB64) {
      content.push(
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: beforeB64 },
        },
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: afterB64 },
        },
      );
    }

    const beforeNote = before.note?.trim() ? ` ("${before.note.trim()}")` : '';
    const afterNote = after.note?.trim() ? ` ("${after.note.trim()}")` : '';

    content.push({
      type: 'text',
      text: [
        'Analyze drawing diffs along a save timeline. Return JSON array: { id, label, beforeDescription, afterDescription, description }',
        `Before${beforeNote} — ${relativeTime(before.createdAt)}`,
        `After${afterNote} — ${relativeTime(after.createdAt)}`,
        pathContext ?? '',
        checkpoints && checkpoints.length > 0
          ? formatPathNotesForPrompt(checkpoints, before, after)
          : '',
        identityHints && identityHints.size > 0
          ? formatIdentityHintsForPrompt(changes, identityHints, Boolean(after.note?.trim()))
          : '',
        buildSceneContextPrompt(after) ?? '',
        'Final changes:',
        changeLines.join('\n'),
        'Use identity hints and save notes when provided. Label changes as parts of the AFTER drawing.',
        'Each line includes pre-detected summary and detail — description must match that net change.',
        'Do not narrate intermediate saves; path context is for naming only.',
        'Avoid generic placeholders (object, shape, blob, random).',
      ].join('\n'),
    });

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content }],
    });

    const text = msg.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ComponentAnalysis[];
      return mergeAnalyses(changes, parsed, identityHints);
    }
  } catch (err) {
    console.warn('Anthropic component analysis failed:', err);
  }
  return mergeAnalyses(changes, buildLocalComponentAnalysis(changes), ctx.identityHints);
}

export async function generateDiffSummary(
  changes: DiffChange[],
  before: Checkpoint,
  after: Checkpoint,
  analyses?: ComponentAnalysis[],
): Promise<string> {
  if (changes.length === 0) {
    return 'No changes between these checkpoints — the drawing stayed the same.';
  }

  if (!hasOpenAiKey() && !(typeof ANTHROPIC_KEY === 'string' && ANTHROPIC_KEY.length > 0)) {
    return buildLocalDiffSummary(changes, before, after);
  }

  const componentLines =
    analyses && analyses.length > 0
      ? analyses
          .map((a) => {
            const parts = [a.label, a.description];
            if (a.beforeDescription && a.afterDescription) {
              parts.push(`Before: ${a.beforeDescription}`, `After: ${a.afterDescription}`);
            }
            return `- ${parts.join(' — ')}`;
          })
          .join('\n')
      : changes
          .map((c) => `- ${kindWord(c.kind)} (${c.componentLabel}): ${c.detail}`)
          .join('\n');

  const beforeNote = before.note?.trim() ? ` ("${before.note.trim()}")` : '';
  const afterNote = after.note?.trim() ? ` ("${after.note.trim()}")` : '';

  try {
    if (hasOpenAiKey()) {
      const client = new OpenAI({
        apiKey: OPENAI_KEY,
        dangerouslyAllowBrowser: true,
      });
      const msg = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 220,
        messages: [
          {
            role: 'user',
            content: [
              'Summarize hand-drawn sketch changes between two checkpoints for the artist.',
              'Focus on visual objects (things you can name), not individual pen strokes.',
              '2–3 sentences. Talk to the artist ("you"). No bullet points. No git jargon.',
              '',
              `Before${beforeNote} — ${relativeTime(before.createdAt)}`,
              `After${afterNote} — ${relativeTime(after.createdAt)}`,
              '',
              'Object-level changes:',
              componentLines,
            ].join('\n'),
          },
        ],
      });
      const text = msg.choices[0]?.message?.content?.trim();
      if (text) return text;
    } else {
      const client = new Anthropic({
        apiKey: ANTHROPIC_KEY,
        dangerouslyAllowBrowser: true,
      });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              'Summarize drawing changes for an artist. 2–3 sentences. "you". No bullets.',
              componentLines,
            ].join('\n'),
          },
        ],
      });
      const text = msg.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (text) return text;
    }
  } catch (err) {
    console.warn('AI diff summary failed, falling back to local:', err);
  }

  return buildLocalDiffSummary(changes, before, after);
}

export async function generateProgressNotes(
  checkpoints: Checkpoint[],
): Promise<string> {
  if (checkpoints.length === 0) {
    return 'Once you save a few checkpoints, the story of how this piece came together will appear here.';
  }
  if (!hasAiKey()) {
    return buildLocalProgressNotes(checkpoints);
  }
  try {
    const ordered = [...checkpoints].sort(
      (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
    );
    const lines = ordered.map((c, i) => {
      const when = relativeTime(c.createdAt);
      const note = c.note?.trim() ? ` — "${c.note.trim()}"` : '';
      return `${i + 1}. (${when})${note}`;
    });
    const prompt = [
      'You are writing a short, warm paragraph for an artist about how their drawing evolved across saved checkpoints.',
      'Focus on the creative journey, not technical changes. Talk directly to the artist ("you"). Keep it to 3–4 sentences.',
      'Do not use the word "version" or any software-version-control vocabulary. No bullet points. Just one paragraph.',
      '',
      `Checkpoints in order, with the artist's own notes when present:`,
      lines.join('\n'),
    ].join('\n');

    if (hasOpenAiKey()) {
      const client = new OpenAI({
        apiKey: OPENAI_KEY,
        dangerouslyAllowBrowser: true,
      });
      const msg = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 220,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.choices[0]?.message?.content?.trim();
      return text || buildLocalProgressNotes(checkpoints);
    }

    const client = new Anthropic({
      apiKey: ANTHROPIC_KEY,
      dangerouslyAllowBrowser: true,
    });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || buildLocalProgressNotes(checkpoints);
  } catch (err) {
    console.warn('AI progress notes failed, falling back to local:', err);
    return buildLocalProgressNotes(checkpoints);
  }
}

function buildLocalProgressNotes(checkpoints: Checkpoint[]): string {
  const ordered = [...checkpoints].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );
  const n = ordered.length;
  const noted = ordered.filter((c) => c.note?.trim());
  const first = ordered[0];
  const last = ordered[n - 1];
  const span = relativeTime(first.createdAt);
  const parts: string[] = [];
  parts.push(
    `You've saved ${n} checkpoint${n === 1 ? '' : 's'} on this piece, the first one ${span}.`,
  );
  if (noted.length > 0) {
    const quotes = noted
      .slice(-2)
      .map((c) => `"${c.note!.trim()}"`)
      .join(' and ');
    parts.push(`Along the way you noted ${quotes}.`);
  }
  if (n >= 2) {
    parts.push(
      `Your latest save lands ${relativeTime(last.createdAt)} — a good moment to step back and see how far it's come.`,
    );
  }
  return parts.join(' ');
}
