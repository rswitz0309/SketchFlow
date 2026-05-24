import { supabase } from './supabase';
import type {
  Checkpoint,
  GalleryFolder,
  Project,
  ProjectBranch,
  ProjectSummary,
} from '../types';

type ProjectRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  parent_project_id?: string | null;
  root_project_id?: string | null;
  forked_from_checkpoint_id?: string | null;
};

type CheckpointRow = {
  id: string;
  project_id: string;
  svg_data: string;
  thumbnail_data_url: string | null;
  note: string | null;
  created_at: string;
};

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentProjectId: row.parent_project_id ?? null,
    rootProjectId: row.root_project_id ?? null,
    forkedFromCheckpointId: row.forked_from_checkpoint_id ?? null,
  };
}

function toCheckpoint(row: CheckpointRow): Checkpoint {
  return {
    id: row.id,
    projectId: row.project_id,
    svgData: row.svg_data,
    thumbnailDataUrl: row.thumbnail_data_url,
    note: row.note,
    createdAt: row.created_at,
  };
}

let branchColumnsAvailable: boolean | null = null;

/** True when `schema-branches.sql` has been applied to the connected database. */
export async function isBranchingAvailable(): Promise<boolean> {
  if (branchColumnsAvailable !== null) return branchColumnsAvailable;
  const { error } = await supabase
    .from('projects')
    .select('parent_project_id')
    .limit(0);
  branchColumnsAvailable = !error;
  return branchColumnsAvailable;
}

export const BRANCHING_SETUP_MESSAGE =
  'Variant branching requires a one-time database update. When you have Supabase access, run the SQL in supabase/schema-branches.sql (Supabase → SQL → New query → Run).';

async function summariesForProjects(projects: Project[]): Promise<ProjectSummary[]> {
  if (projects.length === 0) return [];
  const { data, error } = await supabase
    .from('checkpoints')
    .select('id, project_id, thumbnail_data_url, created_at')
    .in('project_id', projects.map((p) => p.id))
    .order('created_at', { ascending: false });
  if (error) throw error;

  const byProject = new Map<string, { count: number; latestThumb: string | null }>();
  for (const row of (data ?? []) as Pick<
    CheckpointRow,
    'id' | 'project_id' | 'thumbnail_data_url' | 'created_at'
  >[]) {
    const existing = byProject.get(row.project_id);
    if (existing) {
      existing.count += 1;
    } else {
      byProject.set(row.project_id, {
        count: 1,
        latestThumb: row.thumbnail_data_url,
      });
    }
  }

  return projects.map((p) => {
    const agg = byProject.get(p.id);
    return {
      ...p,
      checkpointCount: agg?.count ?? 0,
      latestThumbnailDataUrl: agg?.latestThumb ?? null,
      isVariant: Boolean(p.parentProjectId),
      rootProjectId: p.rootProjectId ?? null,
    };
  });
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toProject(r as ProjectRow));
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await listProjects();
  return summariesForProjects(projects);
}

export interface GalleryLayout {
  standalone: ProjectSummary[];
  folders: GalleryFolder[];
}

/** Gallery rows: main sketches alone, or one folder per root with all variants flat inside. */
export async function listGalleryLayout(): Promise<GalleryLayout> {
  const summaries = await listProjectSummaries();
  const roots = summaries.filter((p) => !p.parentProjectId);
  const variants = summaries.filter((p) => p.parentProjectId);

  const variantsByRoot = new Map<string, ProjectSummary[]>();
  for (const v of variants) {
    const rootId = v.rootProjectId ?? v.parentProjectId;
    if (!rootId) continue;
    const list = variantsByRoot.get(rootId) ?? [];
    list.push(v);
    variantsByRoot.set(rootId, list);
  }

  const standalone: ProjectSummary[] = [];
  const folders: GalleryFolder[] = [];

  for (const root of roots) {
    const branchList = (variantsByRoot.get(root.id) ?? []).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (branchList.length === 0) {
      standalone.push(root);
    } else {
      folders.push({ root, variants: branchList });
    }
  }

  folders.sort(
    (a, b) => new Date(b.root.updatedAt).getTime() - new Date(a.root.updatedAt).getTime(),
  );
  standalone.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return { standalone, folders };
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return toProject(data as ProjectRow);
}

export async function createProject(title: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ title })
    .select('*')
    .single();
  if (error) throw error;
  return toProject(data as ProjectRow);
}

export async function renameProject(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function touchProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function listCheckpoints(projectId: string): Promise<Checkpoint[]> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toCheckpoint(r as CheckpointRow));
}

export async function saveCheckpoint(args: {
  projectId: string;
  svgData: string;
  thumbnailDataUrl: string | null;
  note: string | null;
}): Promise<Checkpoint> {
  const { data, error } = await supabase
    .from('checkpoints')
    .insert({
      project_id: args.projectId,
      svg_data: args.svgData,
      thumbnail_data_url: args.thumbnailDataUrl,
      note: args.note,
    })
    .select('*')
    .single();
  if (error) throw error;
  await touchProject(args.projectId);
  return toCheckpoint(data as CheckpointRow);
}

/** Branches created from checkpoints on this project (any generation). */
export async function listChildBranches(parentProjectId: string): Promise<ProjectBranch[]> {
  if (!(await isBranchingAvailable())) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, title, parent_project_id, root_project_id, forked_from_checkpoint_id, updated_at')
    .eq('parent_project_id', parentProjectId)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProjectRow[];
  if (rows.length === 0) return [];

  const summaries = await summariesForProjects(rows.map(toProject));
  return summaries.map((s) => ({
    id: s.id,
    title: s.title,
    parentProjectId: s.parentProjectId!,
    rootProjectId: s.rootProjectId ?? s.parentProjectId!,
    forkedFromCheckpointId: rows.find((r) => r.id === s.id)!.forked_from_checkpoint_id!,
    updatedAt: s.updatedAt,
    latestThumbnailDataUrl: s.latestThumbnailDataUrl,
    checkpointCount: s.checkpointCount,
  }));
}

/**
 * Fork a variant from a non-latest checkpoint: new project with checkpoints 0..index copied.
 */
export async function createBranchFromCheckpoint(
  parentProjectId: string,
  checkpointId: string,
): Promise<Project> {
  if (!(await isBranchingAvailable())) {
    throw new Error(BRANCHING_SETUP_MESSAGE);
  }

  const parent = await getProject(parentProjectId);
  if (!parent) throw new Error('Project not found');

  const checkpoints = await listCheckpoints(parentProjectId);
  const idx = checkpoints.findIndex((c) => c.id === checkpointId);
  if (idx < 0) throw new Error('Checkpoint not found');
  if (idx === checkpoints.length - 1) {
    throw new Error('Use restore on the latest checkpoint instead of branching');
  }

  const forked = checkpoints[idx];
  const rootId = parent.rootProjectId ?? parent.id;
  const saveNum = idx + 1;
  const noteBit = forked.note?.trim() ? `: ${forked.note.trim()}` : '';
  const branchTitle = `${parent.title} · from save ${saveNum}${noteBit}`;

  const { data: inserted, error: insertErr } = await supabase
    .from('projects')
    .insert({
      title: branchTitle,
      parent_project_id: parentProjectId,
      root_project_id: rootId,
      forked_from_checkpoint_id: checkpointId,
    })
    .select('*')
    .single();
  if (insertErr) throw insertErr;

  const branch = toProject(inserted as ProjectRow);
  const slice = checkpoints.slice(0, idx + 1);

  if (slice.length > 0) {
    const { error: cpErr } = await supabase.from('checkpoints').insert(
      slice.map((cp) => ({
        project_id: branch.id,
        svg_data: cp.svgData,
        thumbnail_data_url: cp.thumbnailDataUrl,
        note: cp.note,
        created_at: cp.createdAt,
      })),
    );
    if (cpErr) throw cpErr;
  }

  await touchProject(branch.id);
  return branch;
}
