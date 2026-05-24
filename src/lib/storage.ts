import { supabase } from './supabase';
import type { Checkpoint, Project, ProjectSummary } from '../types';

type ProjectRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toProject);
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await listProjects();
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
    };
  });
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
