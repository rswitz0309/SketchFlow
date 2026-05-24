import type { Checkpoint } from '../types';
import { diffSvgComponents } from './diffComponents';
import { relativeTime } from './time';
import type { ChangeKind } from './diffStrokes';

function kindWord(kind: ChangeKind): string {
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

function labelFromStepNote(note: string | null | undefined): string | null {
  const t = note?.trim();
  if (!t || t.length > 60) return null;
  return t.replace(/^(add(ed)?|drew|sketch(ed)?|fix(ed)?|update(d)?)\s+/i, '').trim() || t;
}

export function checkpointDisplayName(cp: Checkpoint, index: number): string {
  if (cp.note?.trim()) return `"${cp.note.trim()}" (save #${index + 1})`;
  return `save #${index + 1} · ${relativeTime(cp.createdAt)}`;
}

/**
 * Narrative of each save-to-save step between two compared checkpoints.
 * Gives the AI continuity when comparing distant saves (e.g. #1 vs #6).
 */
export function buildComparePathContext(
  checkpoints: Checkpoint[],
  before: Checkpoint,
  after: Checkpoint,
): string {
  const fromIdx = checkpoints.findIndex((c) => c.id === before.id);
  const toIdx = checkpoints.findIndex((c) => c.id === after.id);
  if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return '';

  const beforeName = checkpointDisplayName(before, fromIdx);
  const afterName = checkpointDisplayName(after, toIdx);
  const stepsApart = toIdx - fromIdx;

  if (stepsApart === 1) {
    return [
      'Timeline context:',
      `You are comparing two consecutive saves: ${beforeName} → ${afterName}.`,
      'Label objects consistently with how they appear in the save notes above.',
    ].join('\n');
  }

  const stepLines: string[] = [];
  const thread: string[] = [];

  for (let i = fromIdx; i < toIdx; i++) {
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    const nameA = checkpointDisplayName(a, i);
    const nameB = checkpointDisplayName(b, i + 1);
    const result = diffSvgComponents(a.svgData, b.svgData);

    if (result.changes.length === 0) {
      stepLines.push(`${nameA} → ${nameB}: drawing unchanged`);
      continue;
    }

    const stepNote = labelFromStepNote(b.note) ?? labelFromStepNote(a.note);
    const changeLines = result.changes.map((c) => {
      const noteTag = stepNote ? ` · save note: "${stepNote}"` : '';
      const line = `${kindWord(c.kind)} · ${c.componentLabel} · ${c.detail}${noteTag}`;
      thread.push(line);
      return `    • ${line}`;
    });
    stepLines.push(`${nameA} → ${nameB}:\n${changeLines.join('\n')}`);
  }

  const threadSummary = [...new Set(thread)].slice(0, 48);

  return [
    'Timeline context (read this before the final diff):',
    `The artist compares ${beforeName} with ${afterName} — ${stepsApart} saves apart.`,
    'The drawing evolved through these intermediate steps:',
    '',
    stepLines.join('\n\n'),
    '',
    'Objects touched along the journey (context only — match each final change to the step where that region actually changed):',
    threadSummary.length > 0
      ? threadSummary.map((t) => `- ${t}`).join('\n')
      : '- no component-level edits between consecutive saves',
    '',
    'The FINAL images below are the endpoints only.',
    'If the "after" checkpoint has no save note, label from the AFTER image — do not copy titles from older noted saves onto unrelated regions.',
  ].join('\n');
}
