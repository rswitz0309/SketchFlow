export type Tool = 'pencil' | 'brush' | 'eraser' | 'select';

export interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  points: [number, number][];
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  parentProjectId?: string | null;
  rootProjectId?: string | null;
  forkedFromCheckpointId?: string | null;
}

/** A variant sketch branched from a checkpoint on another project. */
export interface ProjectBranch {
  id: string;
  title: string;
  parentProjectId: string;
  rootProjectId: string;
  forkedFromCheckpointId: string;
  updatedAt: string;
  latestThumbnailDataUrl: string | null;
  checkpointCount: number;
}

export interface GalleryFolder {
  root: ProjectSummary;
  variants: ProjectSummary[];
}

export interface Checkpoint {
  id: string;
  projectId: string;
  svgData: string;
  thumbnailDataUrl: string | null;
  note: string | null;
  createdAt: string;
}

export interface ProjectSummary extends Project {
  checkpointCount: number;
  latestThumbnailDataUrl: string | null;
  isVariant?: boolean;
  rootProjectId?: string | null;
}

export const CANVAS_W = 1600;
export const CANVAS_H = 1000;
export const CANVAS_BG = '#FFFFFF';
export const THUMB_W = 320;
export const THUMB_H = 200;

export const COLOR_SWATCHES = [
  '#0b1220',
  '#2563eb',
  '#e11d48',
  '#0d9488',
  '#d97706',
  '#7c3aed',
  '#5b6479',
];

export const SIZE_OPTIONS = [2, 4, 8, 16, 28];
