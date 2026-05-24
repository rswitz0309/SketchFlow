/** Whether the artist's save note describes repositioning / assembly (not a new drawing). */
export function noteSuggestsRepositioning(note: string | null | undefined): boolean {
  const t = note?.trim().toLowerCase();
  if (!t) return false;
  return /\b(move|moved|moving|attach|attached|join|joined|complete|completed|position|placed|align|aligned|snap|relocate|shift|part|sleeve|collar|detail)\b/.test(
    t,
  );
}

export function noteSuggestsNewDrawing(note: string | null | undefined): boolean {
  const t = note?.trim().toLowerCase();
  if (!t) return false;
  return /\b(add|added|new|draw|drew|sketch|create|start)\b/.test(t);
}

export function moveIntentFromNote(
  note: string | null | undefined,
  geometryIntent: string,
): string {
  const t = note?.trim();
  if (!t) return geometryIntent;
  if (noteSuggestsRepositioning(t)) {
    if (geometryIntent.includes('join') || geometryIntent.includes('complete')) {
      return `${geometryIntent} · save note: ${t}`;
    }
    return `repositioned per save note · ${t}`;
  }
  return `${geometryIntent} · save note: ${t}`;
}
