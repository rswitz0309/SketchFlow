-- Branching: run in Supabase SQL editor after schema.sql

alter table projects
  add column if not exists parent_project_id uuid references projects(id) on delete cascade,
  add column if not exists root_project_id uuid references projects(id) on delete cascade,
  add column if not exists forked_from_checkpoint_id uuid;

create index if not exists projects_parent_idx on projects(parent_project_id);
create index if not exists projects_root_idx on projects(root_project_id);
