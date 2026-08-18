-- Rode este script inteiro no SQL Editor do seu projeto Supabase.

create extension if not exists "pgcrypto";

create table if not exists funnels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid references funnels(id) on delete cascade,
  name text not null,
  color text,
  position int not null default 0
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid references funnels(id) on delete cascade,
  stage_id uuid references stages(id) on delete set null,
  name text not null,
  phone text,
  email text,
  origin text,
  responsible text,
  value numeric,
  status text not null default 'active', -- 'active' ou 'lost'
  created_at timestamptz default now()
);

alter table funnels enable row level security;
alter table stages enable row level security;
alter table cards enable row level security;

-- Qualquer pessoa autenticada (você e sua parceira) pode ler e escrever tudo.
-- Isso é o esperado para um CRM de uso interno compartilhado pela equipe.
create policy "authenticated full access funnels" on funnels
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated full access stages" on stages
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated full access cards" on cards
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Habilita atualização em tempo real (opcional, mas recomendado)
alter publication supabase_realtime add table funnels;
alter publication supabase_realtime add table stages;
alter publication supabase_realtime add table cards;
