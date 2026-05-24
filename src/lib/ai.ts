import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { Checkpoint } from '../types';
import type { DiffChange } from './diffStrokes';
import { renderComponentPairCrops } from './componentRender';
import { relativeTime } from './time';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const MAX_VISION_COMPONENTS = 8;

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
    case 'sty':
      return 'restyled';
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
      return `You repositioned an object in the ${region} region.`;
    case 'sty':
      return `You changed how an object looks in the ${region} area — color, size, or line weight.`;
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
): Promise<OpenAI.Chat.Completions.ChatCompletionContentPart[]> {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  const beforeFull = stripDataUrl(before.thumbnailDataUrl);
  const afterFull = stripDataUrl(after.thumbnailDataUrl);
  if (beforeFull) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${beforeFull}`, detail: 'low' },
    });
  }
  if (afterFull) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${afterFull}`, detail: 'low' },
    });
  }

  const cropChanges = changes.slice(0, MAX_VISION_COMPONENTS);
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

  const changeLines = changes.map((c, i) => {
    const cropNote =
      i < MAX_VISION_COMPONENTS
        ? ' [cropped before/after pair may follow for this id]'
        : '';
    return `${i + 1}. id=${c.id} | ${kindWord(c.kind)} | canvas region=${c.componentLabel} | ${c.detail}${cropNote}`;
  });

  parts.push({
    type: 'text',
    text: [
      'You analyze hand-drawn sketch diffs using computer vision.',
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
      'Be specific about shape, size, color, and position. Name what it likely depicts. Do not invent changes not listed.',
      '',
      `Before${beforeNote} — ${relativeTime(before.createdAt)}`,
      `After${afterNote} — ${relativeTime(after.createdAt)}`,
      '',
      'Changes:',
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
): Promise<ComponentAnalysis[]> {
  if (changes.length === 0) return [];

  if (!hasOpenAiKey()) {
    if (typeof ANTHROPIC_KEY === 'string' && ANTHROPIC_KEY.length > 0) {
      return analyzeDiffComponentsAnthropic(changes, before, after);
    }
    return buildLocalComponentAnalysis(changes);
  }

  try {
    const client = new OpenAI({
      apiKey: OPENAI_KEY,
      dangerouslyAllowBrowser: true,
    });

    const content = await buildVisionContent(changes, before, after);

    const msg = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      messages: [{ role: 'user', content }],
    });

    const text = msg.choices[0]?.message?.content?.trim() ?? '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ComponentAnalysis[];
      const byId = new Map(parsed.map((p) => [p.id, p]));
      return changes.map((c) => {
        const hit = byId.get(c.id);
        return hit
          ? {
              id: c.id,
              label: hit.label,
              description: hit.description,
              beforeDescription: hit.beforeDescription ?? undefined,
              afterDescription: hit.afterDescription ?? undefined,
            }
          : {
              id: c.id,
              label: c.componentLabel,
              description: localComponentDescription(c),
            };
      });
    }
  } catch (err) {
    console.warn('OpenAI component analysis failed, falling back:', err);
  }

  return buildLocalComponentAnalysis(changes);
}

async function analyzeDiffComponentsAnthropic(
  changes: DiffChange[],
  before: Checkpoint,
  after: Checkpoint,
): Promise<ComponentAnalysis[]> {
  try {
    const client = new Anthropic({
      apiKey: ANTHROPIC_KEY,
      dangerouslyAllowBrowser: true,
    });

    const changeLines = changes.map((c, i) => {
      return `${i + 1}. id=${c.id} | ${kindWord(c.kind)} | region=${c.componentLabel} | ${c.detail}`;
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

    content.push({
      type: 'text',
      text: [
        'Analyze drawing diffs. Return JSON array: { id, label, beforeDescription, afterDescription, description }',
        changeLines.join('\n'),
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
      const byId = new Map(parsed.map((p) => [p.id, p]));
      return changes.map((c) => {
        const hit = byId.get(c.id);
        return hit ?? { id: c.id, label: c.componentLabel, description: localComponentDescription(c) };
      });
    }
  } catch (err) {
    console.warn('Anthropic component analysis failed:', err);
  }
  return buildLocalComponentAnalysis(changes);
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
