-- 01 : Tables, colonnes, index, temps réel (tout le schéma de données).
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- =====================================================================
-- Grimoire JDR : tables + temps réel (1/3)
-- Supabase > SQL Editor > New query > coller > Run. Exécuter les fichiers DANS L'ORDRE
-- (001, 002, 003...). Chaque fichier ne s'exécute qu'une fois.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gm_id       uuid not null references auth.users(id) on delete cascade,
  join_code   text not null unique,
  template    jsonb not null default '{"stats":[],"resources":[],"currency":"Or"}',
  settings    jsonb not null default '{"playersEditInventory":true,"playersEditStats":true,"shareSheets":false}',
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('gm','player')),
  display_name text not null default '',
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'Sans nom',
  avatar      text not null default '🧙',
  subtitle    text not null default '',
  stats       jsonb not null default '{}',
  resources   jsonb not null default '{}',
  currency    integer not null default 0,
  notes       text not null default '',
  updated_at  timestamptz not null default now()
);

create index if not exists characters_campaign_idx on public.characters(campaign_id);

create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  name         text not null,
  qty          integer not null default 1 check (qty >= 0),
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists items_campaign_idx on public.items(campaign_id);

create table if not exists public.rolls (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  label       text not null default '',
  formula     text not null,
  detail      text not null default '',
  total       integer not null,
  secret      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists rolls_campaign_idx on public.rolls(campaign_id, created_at desc);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  title       text not null default '',
  content     text not null default '',
  visibility  text not null default 'all' check (visibility in ('all','gm','private')),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_campaign_idx on public.notes(campaign_id);

-- ------------------------------------------------------------- temps réel
do $$
declare t text;
begin
  foreach t in array array['campaigns','members','characters','items','rolls','notes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- --------------------------------------------------------------- RLS
alter table public.campaigns  enable row level security;

alter table public.members    enable row level security;

alter table public.characters enable row level security;

alter table public.items      enable row level security;

alter table public.rolls      enable row level security;

alter table public.notes      enable row level security;

-- =====================================================================
-- Grimoire JDR : fiche D&D 2024 (v0.2)
-- Supabase > SQL Editor > New query > coller > Run., 002, 003.
-- =====================================================================

-- Fiche D&D (caracs, compétences, états, pièces…) en JSON.
alter table public.characters add column if not exists sheet jsonb not null default '{}';

-- =====================================================================
-- Grimoire JDR : PV réservés au MJ + objets équipés/harmonisés (v0.3)
-- Supabase > SQL Editor > New query > coller > Run. à 004.
-- =====================================================================

-- Objets portés / harmonisés.
alter table public.items add column if not exists equipped boolean not null default false;

alter table public.items add column if not exists attuned  boolean not null default false;

-- =====================================================================
-- Grimoire JDR : combat et initiative (v0.4) + limite de sorts préparés
-- Supabase > SQL Editor > New query > coller > Run. à 006.
-- =====================================================================

-- État public du combat (ordre, tour, round, état visible des monstres), modifié par le MJ.
alter table public.campaigns add column if not exists combat jsonb not null default '{}';

-- Données secrètes du MJ (PV, CA des monstres) : invisibles pour les joueurs.
create table if not exists public.campaign_secrets (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  data        jsonb not null default '{"monsters":{}}',
  updated_at  timestamptz not null default now()
);

alter table public.campaign_secrets enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.campaign_secrets;
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- Grimoire JDR : actions de combat des joueurs + objets de soin (v0.5)
-- Même calcul que src/lib/dnd/resolve.ts (resolveAction). à 007.
-- =====================================================================

alter table public.items add column if not exists heal text not null default '';

-- carte de combat (déplacements), « Foncer », historique (rolls.kind).

-- Historique : un « jet » peut aussi être un événement (dégâts du MJ, objet donné, tour suivant…).
alter table public.rolls add column if not exists kind text not null default 'roll';

-- plan hors combat, décor (murs, terrain difficile), image de fond, chemins, attaques d'opportunité,
-- « Se désengager », jet de sauvegarde visible.

-- Image de fond de la carte (séparée de campaigns.combat pour ne pas la renvoyer à chaque déplacement).
create table if not exists public.campaign_maps (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  data        text not null,
  updated_at  timestamptz not null default now()
);

alter table public.campaign_maps enable row level security;

-- marchands et coffres (préparés par le MJ, montrés ou cachés), achat atomique (bourse + objet),
-- plusieurs plans de carte (images par plan).

-- Plusieurs images de carte par campagne : 'current' = carte affichée, sinon id d'un plan enregistré.
alter table public.campaign_maps add column if not exists map_id text not null default 'current';

alter table public.campaign_maps drop constraint if exists campaign_maps_pkey;

alter table public.campaign_maps add primary key (campaign_id, map_id);

-- Marchands et coffres
create table if not exists public.shops (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name        text not null default 'Marchand',
  avatar      text not null default '🧙',
  kind        text not null default 'merchant' check (kind in ('merchant', 'chest')),
  visible     boolean not null default false,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists shops_campaign_idx on public.shops(campaign_id);

create table if not exists public.shop_items (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name        text not null,
  qty         integer not null default 1 check (qty >= 0),
  price_cp    integer not null default 0 check (price_cp >= 0),
  description text not null default '',
  heal        text,
  created_at  timestamptz not null default now()
);

create index if not exists shop_items_shop_idx on public.shop_items(shop_id);

alter table public.shops enable row level security;

alter table public.shop_items enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.shops;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shop_items;
exception when duplicate_object then null;
end $$;

-- ---------- Revente aux marchands
alter table public.shops add column if not exists buys boolean not null default true;

-- ---------- Notes : le MJ prépare des notes cachées et les révèle à certains joueurs (reader_ids) ou à tous.
alter table public.notes add column if not exists reader_ids uuid[] not null default '{}';
