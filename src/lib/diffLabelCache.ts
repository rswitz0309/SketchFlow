import type { ComponentAnalysis } from './ai';

const STORAGE_KEY = 'sketchflow-diff-label-cache-v2';
const MAX_ENTRIES_PER_PROJECT = 120;

export interface CachedPairLabels {
  beforeId: string;
  afterId: string;
  fingerprint: string;
  analyses: ComponentAnalysis[];
  updatedAt: number;
}

interface Store {
  [projectId: string]: CachedPairLabels[];
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function pairKey(beforeId: string, afterId: string): string {
  return `${beforeId}→${afterId}`;
}

export function getCachedPairLabels(
  projectId: string,
  beforeId: string,
  afterId: string,
  fingerprint: string,
): ComponentAnalysis[] | null {
  const list = readStore()[projectId] ?? [];
  const hit = list.find(
    (e) =>
      e.beforeId === beforeId &&
      e.afterId === afterId &&
      e.fingerprint === fingerprint,
  );
  return hit?.analyses ?? null;
}

export function setCachedPairLabels(
  projectId: string,
  beforeId: string,
  afterId: string,
  fingerprint: string,
  analyses: ComponentAnalysis[],
): void {
  const store = readStore();
  const list = store[projectId] ?? [];
  const next: CachedPairLabels = {
    beforeId,
    afterId,
    fingerprint,
    analyses,
    updatedAt: Date.now(),
  };
  const filtered = list.filter(
    (e) => !(e.beforeId === beforeId && e.afterId === afterId),
  );
  filtered.unshift(next);
  store[projectId] = filtered.slice(0, MAX_ENTRIES_PER_PROJECT);
  writeStore(store);
}

/** Read cache regardless of fingerprint (for path composition from prior compares). */
export function getCachedPairLabelsLoose(
  projectId: string,
  beforeId: string,
  afterId: string,
): CachedPairLabels | null {
  const list = readStore()[projectId] ?? [];
  return list.find((e) => e.beforeId === beforeId && e.afterId === afterId) ?? null;
}

export function clearProjectLabelCache(projectId: string): void {
  const store = readStore();
  delete store[projectId];
  writeStore(store);
}

export { pairKey };
