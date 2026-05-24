import type { ChangeKind, DiffChange } from './diffStrokes';

function kindWord(kind: ChangeKind): string {
  switch (kind) {
    case 'add':
      return 'Added';
    case 'rem':
      return 'Removed';
    case 'mov':
      return 'Moved';
    case 'sty':
      return 'Restyled';
  }
}

/** Label derived only from this diff hunk (no save notes). */
export function suggestLabelFromChange(c: DiffChange): string {
  const region = c.componentLabel;
  const detail = c.detail?.trim();
  if (detail && detail.length < 48) {
    return `${kindWord(c.kind)} · ${detail}`;
  }
  return `${kindWord(c.kind)} · ${region}`;
}
