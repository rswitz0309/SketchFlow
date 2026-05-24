-- SketchFlow schema. Run this once in the Supabase SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  parent_project_id uuid references projects(id) on delete cascade,
  root_project_id uuid references projects(id) on delete cascade,
  forked_from_checkpoint_id uuid
);
create index if not exists projects_parent_idx on projects(parent_project_id);
create index if not exists projects_root_idx on projects(root_project_id);

create table if not exists checkpoints (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  svg_data text not null,
  thumbnail_data_url text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists checkpoints_project_created_idx
  on checkpoints(project_id, created_at desc);

alter table projects enable row level security;
alter table checkpoints enable row level security;

drop policy if exists "anon all projects" on projects;
drop policy if exists "anon all checkpoints" on checkpoints;

create policy "anon all projects" on projects
  for all to anon using (true) with check (true);
create policy "anon all checkpoints" on checkpoints
  for all to anon using (true) with check (true);

-- Table-level grants (required for PostgREST / publishable key)
grant usage on schema public to anon, authenticated;
grant all on table projects to anon, authenticated;
grant all on table checkpoints to anon, authenticated;
