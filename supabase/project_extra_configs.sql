create table if not exists public.project_extra_configs (
  project_id text primary key references public.projects(id) on delete cascade,
  owner_id uuid not null,
  instructor_rate numeric not null default 0,
  ad_share_rate numeric not null default 0,
  auto_prev_opt_out boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_extra_configs_owner_id
  on public.project_extra_configs(owner_id);

create or replace function public.set_project_extra_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_project_extra_configs_updated_at on public.project_extra_configs;
create trigger trg_project_extra_configs_updated_at
before update on public.project_extra_configs
for each row
execute function public.set_project_extra_configs_updated_at();

alter table public.project_extra_configs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_extra_configs'
      and policyname = 'project_extra_configs_owner_select'
  ) then
    create policy project_extra_configs_owner_select
      on public.project_extra_configs
      for select
      using (auth.uid() = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_extra_configs'
      and policyname = 'project_extra_configs_owner_insert'
  ) then
    create policy project_extra_configs_owner_insert
      on public.project_extra_configs
      for insert
      with check (auth.uid() = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_extra_configs'
      and policyname = 'project_extra_configs_owner_update'
  ) then
    create policy project_extra_configs_owner_update
      on public.project_extra_configs
      for update
      using (auth.uid() = owner_id)
      with check (auth.uid() = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_extra_configs'
      and policyname = 'project_extra_configs_owner_delete'
  ) then
    create policy project_extra_configs_owner_delete
      on public.project_extra_configs
      for delete
      using (auth.uid() = owner_id);
  end if;
end $$;
