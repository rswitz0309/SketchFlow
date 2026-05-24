import type { Checkpoint, ProjectSummary } from '../types';
import { listCheckpoints } from './storage';

export interface FamilyGraphNode {
  id: string;
  kind: 'root' | 'variant';
  displayName: string;
}

export interface FamilyGraphEdge {
  fromId: string;
  toId: string;
  label: string;
}

export interface FamilyGraphData {
  root: ProjectSummary;
  nodes: FamilyGraphNode[];
  edges: FamilyGraphEdge[];
}

export interface NodeLayout {
  cx: number;
  cy: number;
  depth: number;
  branchIndex: number;
}

export interface TreeGraphLayout {
  positions: Map<string, NodeLayout>;
  width: number;
  height: number;
  /** Tight bounds around nodes + labels (for initial viewport fit). */
  contentBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export const ROOT_R = 9;
export const NODE_R = 6;
const H_UNIT = 72;
const V_LEVEL = 88;
const PAD = 64;
const LABEL_GUTTER = 140;

export const BRANCH_COLORS = [
  '#7c6f64',
  '#2563eb',
  '#0d9488',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
];

function parseDisplayName(title: string, rootTitle: string): string {
  const fromSave = title.match(/^(.+?)\s*·\s*from save \d+/i);
  if (fromSave) return fromSave[1].trim();
  return title;
}

function connectionLabel(
  parentCps: Checkpoint[],
  forkId: string | null | undefined,
): string {
  if (!forkId) return 'variant';
  const idx = parentCps.findIndex((c) => c.id === forkId);
  if (idx < 0) return 'variant';
  const note = parentCps[idx].note?.trim();
  if (note) return note.length > 32 ? `${note.slice(0, 29)}…` : note;
  return `Save ${idx + 1}`;
}

export async function buildFamilyGraph(
  root: ProjectSummary,
  variants: ProjectSummary[],
): Promise<FamilyGraphData> {
  const parentIds = new Set<string>([root.id]);
  for (const v of variants) {
    if (v.parentProjectId) parentIds.add(v.parentProjectId);
  }

  const checkpointsByProject = new Map<string, Checkpoint[]>();
  await Promise.all(
    [...parentIds].map(async (pid) => {
      checkpointsByProject.set(pid, await listCheckpoints(pid));
    }),
  );

  const nodes: FamilyGraphNode[] = [
    { id: root.id, kind: 'root', displayName: root.title },
  ];
  const edges: FamilyGraphEdge[] = [];

  for (const v of variants) {
    const parentId = v.parentProjectId ?? root.id;
    const parentCps = checkpointsByProject.get(parentId) ?? [];
    nodes.push({
      id: v.id,
      kind: 'variant',
      displayName: parseDisplayName(v.title, root.title),
    });
    edges.push({
      fromId: parentId,
      toId: v.id,
      label: connectionLabel(parentCps, v.forkedFromCheckpointId),
    });
  }

  return { root, nodes, edges };
}

function buildAdjacency(
  nodes: FamilyGraphNode[],
  edges: FamilyGraphEdge[],
  rootId: string,
) {
  const children = new Map<string, string[]>();
  const parentOf = new Map<string, string>();

  for (const e of edges) {
    const list = children.get(e.fromId) ?? [];
    list.push(e.toId);
    children.set(e.fromId, list);
    parentOf.set(e.toId, e.fromId);
  }

  const sortKids = (id: string) => {
    const list = children.get(id) ?? [];
    list.sort((a, b) => {
      const na = nodes.find((n) => n.id === a)?.displayName ?? '';
      const nb = nodes.find((n) => n.id === b)?.displayName ?? '';
      return na.localeCompare(nb);
    });
    children.set(id, list);
  };

  sortKids(rootId);
  for (const n of nodes) sortKids(n.id);

  function branchAncestor(id: string): string {
    let cur = id;
    while (parentOf.has(cur) && parentOf.get(cur) !== rootId) {
      cur = parentOf.get(cur)!;
    }
    return parentOf.get(cur) === rootId ? cur : id;
  }

  const branchIndex = new Map<string, number>();
  const rootChildren = children.get(rootId) ?? [];
  rootChildren.forEach((childId, i) => branchIndex.set(childId, i));
  for (const n of nodes) {
    if (n.id === rootId) continue;
    const anc = branchAncestor(n.id);
    if (branchIndex.has(anc)) branchIndex.set(n.id, branchIndex.get(anc)!);
  }

  return { children, branchIndex };
}

/** Top-down pedigree tree: root at top, variants fan out by generation. */
export function layoutTreeFamilyGraph(
  nodes: FamilyGraphNode[],
  edges: FamilyGraphEdge[],
  rootId: string,
): TreeGraphLayout {
  const { children, branchIndex } = buildAdjacency(nodes, edges, rootId);

  let leafCursor = 0;
  const positions = new Map<string, NodeLayout>();

  function layoutSubtree(id: string, depth: number): number {
    const ch = children.get(id) ?? [];
    const bi = id === rootId ? -1 : (branchIndex.get(id) ?? 0);

    if (ch.length === 0) {
      const cx = (leafCursor + 0.5) * H_UNIT;
      leafCursor += 1;
      positions.set(id, { cx, cy: depth * V_LEVEL, depth, branchIndex: bi });
      return cx;
    }

    const childCenters = ch.map((c) => layoutSubtree(c, depth + 1));
    const cx =
      (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
    positions.set(id, { cx, cy: depth * V_LEVEL, depth, branchIndex: bi });
    return cx;
  }

  layoutSubtree(rootId, 0);

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = 0;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.cx);
    maxX = Math.max(maxX, pos.cx);
    maxY = Math.max(maxY, pos.cy);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
    maxY = 0;
  }

  const offsetX = PAD + LABEL_GUTTER / 2 - minX;
  const offsetY = PAD;

  for (const [id, pos] of positions) {
    positions.set(id, {
      ...pos,
      cx: pos.cx + offsetX,
      cy: pos.cy + offsetY,
    });
  }

  const width = maxX - minX + PAD * 2 + LABEL_GUTTER;
  const height = maxY + PAD * 2 + 48;

  const LABEL_EXTEND = 168;
  const NODE_PAD = 36;
  let bMinX = Infinity;
  let bMaxX = -Infinity;
  let bMinY = Infinity;
  let bMaxY = -Infinity;
  for (const pos of positions.values()) {
    bMinX = Math.min(bMinX, pos.cx - NODE_PAD);
    bMaxX = Math.max(bMaxX, pos.cx + LABEL_EXTEND);
    bMinY = Math.min(bMinY, pos.cy - NODE_PAD);
    bMaxY = Math.max(bMaxY, pos.cy + NODE_PAD);
  }
  if (!Number.isFinite(bMinX)) {
    bMinX = 0;
    bMaxX = width;
    bMinY = 0;
    bMaxY = height;
  }

  return {
    positions,
    width,
    height,
    contentBounds: { minX: bMinX, maxX: bMaxX, minY: bMinY, maxY: bMaxY },
  };
}

/** Orthogonal tree connector (parent above child). */
export function treeEdgePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  fromIsRoot: boolean,
): string {
  const rFrom = fromIsRoot ? ROOT_R : NODE_R;
  const y1 = ay + rFrom + 2;
  const y2 = by - NODE_R - 2;
  const midY = y1 + (y2 - y1) * 0.5;
  return `M ${ax} ${y1} L ${ax} ${midY} L ${bx} ${midY} L ${bx} ${y2}`;
}

export function edgeLabelPoint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  fromIsRoot: boolean,
): { x: number; y: number } {
  const rFrom = fromIsRoot ? ROOT_R : NODE_R;
  const y1 = ay + rFrom + 2;
  const y2 = by - NODE_R - 2;
  const midY = y1 + (y2 - y1) * 0.5;
  return { x: (ax + bx) / 2, y: midY };
}

export function truncateLabel(text: string, maxLen = 22): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
