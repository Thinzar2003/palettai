-- AI Brand Studio — initial schema (used from stage 2 onward: saving & versioning brands)

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  slug        text unique,                -- for share links: /b/<slug>
  brief       jsonb not null,             -- the original Brief
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.brand_versions (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands (id) on delete cascade,
  version     int  not null,
  kit         jsonb not null,             -- the full BrandKit returned by the API
  locked      text[] not null default '{}', -- parts the user locked: palette, fonts, logo...
  source      text not null,              -- anthropic | openai | mock
  created_at  timestamptz not null default now(),
  unique (brand_id, version)
);

create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands (id) on delete cascade,
  kind        text not null check (kind in ('logo_svg','icon_png','mockup','guide_pdf','social_post')),
  storage_path text not null,             -- path inside the 'brand-assets' storage bucket
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists brand_versions_brand_idx on public.brand_versions (brand_id, version desc);
create index if not exists assets_brand_idx on public.assets (brand_id);

-- Row Level Security: users only see their own brands; public brands are readable by anyone.
alter table public.brands enable row level security;
alter table public.brand_versions enable row level security;
alter table public.assets enable row level security;

create policy "own brands" on public.brands
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public brands readable" on public.brands
  for select using (is_public);

create policy "own versions" on public.brand_versions
  for all using (exists (select 1 from public.brands b where b.id = brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = brand_id and b.user_id = auth.uid()));
create policy "public versions readable" on public.brand_versions
  for select using (exists (select 1 from public.brands b where b.id = brand_id and b.is_public));

create policy "own assets" on public.assets
  for all using (exists (select 1 from public.brands b where b.id = brand_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.brands b where b.id = brand_id and b.user_id = auth.uid()));
