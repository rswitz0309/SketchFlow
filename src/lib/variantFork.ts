import type { Checkpoint, Project } from '../types';
import { listCheckpoints } from './storage';

const FOCUS_KEY = (projectId: string) => `sf:focus-fork:${projectId}`;

/** Index of the checkpoint this variant was forked from (matches parent save order). */
export async function resolveVariantForkCheckpointIndex(
  project: Project,
  checkpoints: Checkpoint[],
): Promise<number | null> {
  if (!project.parentProjectId || !project.forkedFromCheckpointId) return null;

  const parentCps = await listCheckpoints(project.parentProjectId);
  const parentIdx = parentCps.findIndex((c) => c.id === project.forkedFromCheckpointId);
  if (parentIdx < 0 || parentIdx >= checkpoints.length) return null;

  return parentIdx;
}

/** After branching, focus the fork save the first time the variant timeline opens. */
export function markForkForTimelineFocus(projectId: string): void {
  try {
    sessionStorage.setItem(FOCUS_KEY(projectId), '1');
  } catch {
    /* ignore */
  }
}

export function consumeForkTimelineFocus(projectId: string): boolean {
  try {
    const v = sessionStorage.getItem(FOCUS_KEY(projectId));
    if (!v) return false;
    sessionStorage.removeItem(FOCUS_KEY(projectId));
    return true;
  } catch {
    return false;
  }
}
