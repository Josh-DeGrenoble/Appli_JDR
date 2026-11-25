-- Grimoire JDR : installation complète de la base (toutes les migrations, dans l’ordre).
-- Fichier généré par scripts/sql-complet.mjs : ne pas modifier à la main.
-- Base NEUVE : copie tout ce fichier dans Supabase → SQL Editor → New query → Run (une seule fois).
-- Base déjà installée : exécute seulement les nouveaux fichiers de supabase/migrations/.
-- Contient : 01_tables.sql → 09_combat.sql (9 fichiers).

-- ================================ 01_tables.sql ================================
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

-- ================================ 02_acces.sql ================================
-- 02 : Droits : fonctions d’accès (MJ, membre, qui modifie quoi), règles RLS, garde-fous sur les PV, objets et fiches.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- =====================================================================
-- Grimoire JDR : règles d'accès (RLS) (2/3)
-- Supabase > SQL Editor > New query > coller > Run. Exécuter les fichiers DANS L'ORDRE
-- (001, 002, 003...). Chaque fichier ne s'exécute qu'une fois.
-- =====================================================================

-- ------------------------------------------------------- fonctions d'aide
create or replace function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where campaign_id = cid and user_id = auth.uid());
$$;

create or replace function public.is_gm(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where campaign_id = cid and user_id = auth.uid() and role = 'gm');
$$;

-- =====================================================================
-- Grimoire JDR : droits des joueurs (v0.3.1)
-- Un joueur ne se redonne jamais seul PV, sorts, emplacements, capacités, objets ou pièces.
-- Il peut les UTILISER (dépenser, consommer, jeter, donner à un autre perso).
-- Supabase > SQL Editor > New query > coller > Run. à 005.
-- =====================================================================

create or replace function public.is_gm_of_char(char_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from characters ch where ch.id = char_id and public.is_gm(ch.campaign_id));
$$;

-- MJ, ou propriétaire du perso si la campagne autorise les joueurs à gérer leur inventaire.
create or replace function public.can_edit_inventory(char_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from characters ch join campaigns c on c.id = ch.campaign_id
    where ch.id = char_id
      and (public.is_gm(c.id)
           or (ch.owner_id = auth.uid() and coalesce((c.settings->>'playersEditInventory')::boolean, true)))
  );
$$;

create or replace function public.can_edit_character(char_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from characters ch
    where ch.id = char_id and (ch.owner_id = auth.uid() or public.is_gm(ch.campaign_id))
  );
$$;

-- MJ, ou propriétaire si la table autorise les joueurs à gérer leurs PV (réglage playersEditHp, non par défaut).
create or replace function public.can_edit_hp(char_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from characters ch join campaigns c on c.id = ch.campaign_id
    where ch.id = char_id
      and (public.is_gm(c.id)
           or (ch.owner_id = auth.uid() and coalesce((c.settings->>'playersEditHp')::boolean, false)))
  );
$$;

-- Garde-fou : un joueur ne peut pas modifier les PV (colonne resources) par une mise à jour directe.
-- Exception interne : death_save active « grimoire.allow_hp » le temps de sa mise à jour.
create or replace function public.guard_hp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.resources is distinct from old.resources
     and not public.is_gm(new.campaign_id)
     and not coalesce((select (settings->>'playersEditHp')::boolean from campaigns where id = new.campaign_id), false)
     and coalesce(current_setting('grimoire.allow_hp', true), '') <> 'on' then
    raise exception 'Seul le MJ peut modifier les PV';
  end if;
  return new;
end $$;

drop trigger if exists characters_guard_hp on public.characters;

create trigger characters_guard_hp before update on public.characters
  for each row execute function public.guard_hp();

-- Fiche protégée : un joueur qui écrit directement dans la table (sans passer par une fonction de l'appli, qui elles
-- tournent avec les droits du serveur) ne peut changer que nom, avatar, sous-titre et notes ; pas la fiche D&D.
-- Volontairement sans « security definer » : current_user vaut alors « authenticated » pour un appel direct.
create or replace function public.guard_sheet() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' and not public.is_gm(old.campaign_id)
     and (new.sheet is distinct from old.sheet or new.owner_id is distinct from old.owner_id or new.campaign_id is distinct from old.campaign_id
          or (new.stats is distinct from old.stats
              and not coalesce((select (settings->>'playersEditStats')::boolean from campaigns where id = old.campaign_id), true))) then
    raise exception 'Fiche modifiable seulement par l’appli (ou le MJ)';
  end if;
  return new;
end $$;

drop trigger if exists characters_guard_sheet on public.characters;

create trigger characters_guard_sheet before update on public.characters
  for each row execute function public.guard_sheet();

-- Le joueur ne peut pas modifier la formule de soin d'un objet (seul le MJ).
create or replace function public.guard_items() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_gm_of_char(old.character_id) or coalesce(current_setting('grimoire.allow_items', true), '') = 'on' then
    return new;
  end if;
  if new.qty > old.qty or new.name <> old.name or new.description <> old.description
     or new.character_id <> old.character_id or new.heal <> old.heal then
    raise exception 'Seul le MJ peut ajouter ou modifier un objet';
  end if;
  return new;
end $$;

drop trigger if exists items_guard on public.items;

create trigger items_guard before update on public.items for each row execute function public.guard_items();

drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select using (public.is_member(id));

drop policy if exists campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update using (public.is_gm(id)) with check (public.is_gm(id));

drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete using (public.is_gm(id));

drop policy if exists members_select on public.members;
create policy members_select on public.members for select using (public.is_member(campaign_id));

drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
  using (role <> 'gm' and (user_id = auth.uid() or public.is_gm(campaign_id)));

drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters for select using (public.is_member(campaign_id));

drop policy if exists characters_insert on public.characters;
create policy characters_insert on public.characters for insert
  with check (public.is_member(campaign_id) and (owner_id = auth.uid() or public.is_gm(campaign_id)));

drop policy if exists characters_update on public.characters;
create policy characters_update on public.characters for update
  using (owner_id = auth.uid() or public.is_gm(campaign_id))
  with check (owner_id = auth.uid() or public.is_gm(campaign_id));

drop policy if exists characters_delete on public.characters;
create policy characters_delete on public.characters for delete
  using (owner_id = auth.uid() or public.is_gm(campaign_id));

drop policy if exists items_select on public.items;
create policy items_select on public.items for select using (public.is_member(campaign_id));

drop policy if exists items_update on public.items;
create policy items_update on public.items for update
  using (public.can_edit_inventory(character_id)) with check (public.can_edit_inventory(character_id));

drop policy if exists items_delete on public.items;
create policy items_delete on public.items for delete using (public.can_edit_inventory(character_id));

drop policy if exists rolls_select on public.rolls;
create policy rolls_select on public.rolls for select
  using (public.is_member(campaign_id) and (not secret or user_id = auth.uid() or public.is_gm(campaign_id)));

drop policy if exists rolls_insert on public.rolls;
create policy rolls_insert on public.rolls for insert
  with check (public.is_member(campaign_id) and user_id = auth.uid());

drop policy if exists rolls_delete on public.rolls;
create policy rolls_delete on public.rolls for delete using (public.is_gm(campaign_id));

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes for insert
  with check (public.is_member(campaign_id) and author_id = auth.uid());

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes for update
  using (author_id = auth.uid() or (public.is_gm(campaign_id) and visibility <> 'private'))
  with check (author_id = auth.uid() or (public.is_gm(campaign_id) and visibility <> 'private'));

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes for delete
  using (author_id = auth.uid() or (public.is_gm(campaign_id) and visibility <> 'private'));

drop policy if exists items_insert on public.items;
create policy items_insert on public.items for insert with check (public.is_gm_of_char(character_id));

drop policy if exists secrets_gm on public.campaign_secrets;
create policy secrets_gm on public.campaign_secrets for all
  using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));

drop policy if exists maps_gm on public.campaign_maps;
create policy maps_gm on public.campaign_maps for all using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));

drop policy if exists shops_read on public.shops;
create policy shops_read on public.shops for select using (public.is_gm(campaign_id) or (visible and public.is_member(campaign_id)));

drop policy if exists shops_gm on public.shops;
create policy shops_gm on public.shops for all using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));

drop policy if exists shop_items_read on public.shop_items;
create policy shop_items_read on public.shop_items for select using (
  public.is_gm(campaign_id) or exists (select 1 from shops s where s.id = shop_id and s.visible and public.is_member(s.campaign_id)));

drop policy if exists shop_items_gm on public.shop_items;
create policy shop_items_gm on public.shop_items for all using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select using (
  author_id = auth.uid()
  or (public.is_member(campaign_id) and (visibility = 'all' or (visibility = 'gm' and public.is_gm(campaign_id)) or auth.uid() = any(reader_ids)))
);

drop policy if exists maps_read on public.campaign_maps;
create policy maps_read on public.campaign_maps for select using (
  public.is_member(campaign_id) and (
    map_id = 'current' or public.is_gm(campaign_id) or exists (
      select 1 from public.campaigns c, jsonb_array_elements(coalesce(c.settings->'maps', '[]'::jsonb)) m
      where c.id = campaign_maps.campaign_id and m->>'id' = campaign_maps.map_id and coalesce((m->>'shared')::boolean, false)
    )
  )
);

-- ================================ 03_fiche.sql ================================
-- 03 : Campagne et fiche : créer / rejoindre, PV, pièces, capacités, emplacements, sorts préparés, modification de la fiche, pseudo.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- =====================================================================
-- Grimoire JDR : fonctions appelées par l’appli (3/3)
-- Supabase > SQL Editor > New query > coller > Run. Exécuter les fichiers DANS L'ORDRE
-- (001, 002, 003...). Chaque fichier ne s'exécute qu'une fois.
-- =====================================================================

-- ------------------------------------------------------------- fonctions RPC
create or replace function public.create_campaign(p_name text, p_template jsonb, p_display_name text)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_row  campaigns;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from campaigns where join_code = v_code);
  end loop;
  insert into campaigns (name, gm_id, join_code, template)
    values (coalesce(nullif(trim(p_name), ''), 'Nouvelle campagne'), auth.uid(), v_code, p_template)
    returning * into v_row;
  insert into members (campaign_id, user_id, role, display_name)
    values (v_row.id, auth.uid(), 'gm', coalesce(p_display_name, ''));
  return v_row;
end $$;

grant execute on function public.create_campaign(text, jsonb, text) to authenticated;

create or replace function public.join_campaign(p_code text, p_display_name text)
returns public.campaigns language plpgsql security definer set search_path = public as $$
declare v_row campaigns;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select * into v_row from campaigns where join_code = upper(trim(p_code));
  if not found then raise exception 'Aucune campagne avec ce code'; end if;
  insert into members (campaign_id, user_id, role, display_name)
    values (v_row.id, auth.uid(), 'player', coalesce(p_display_name, ''))
    on conflict (campaign_id, user_id) do nothing;
  return v_row;
end $$;

grant execute on function public.join_campaign(text, text) to authenticated;

-- Ajuste une jauge sans écraser les modifications simultanées. Plafonnée à [0, max].
create or replace function public.adjust_resource(p_char uuid, p_key text, p_delta integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_character(p_char) then raise exception 'Accès refusé'; end if;
  update characters set
    resources = resources || jsonb_build_object(p_key,
      coalesce(resources->p_key, '{"current":0,"max":0}'::jsonb) || jsonb_build_object('current',
        greatest(0, least(
          coalesce((resources->p_key->>'current')::int, 0) + p_delta,
          case when coalesce((resources->p_key->>'max')::int, 0) > 0
               then (resources->p_key->>'max')::int else 2147483647 end
        )))),
    updated_at = now()
  where id = p_char;
end $$;

grant execute on function public.adjust_resource(uuid, text, integer) to authenticated;

create or replace function public.adjust_currency(p_char uuid, p_delta integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_inventory(p_char) then raise exception 'Accès refusé'; end if;
  update characters set currency = greatest(0, currency + p_delta), updated_at = now() where id = p_char;
end $$;

grant execute on function public.adjust_currency(uuid, integer) to authenticated;

-- Interne : dégâts (< 0, PV temporaires d'abord) ou soins (> 0), sans contrôle de droits. Jamais appelée directement.
create or replace function public._apply_hp_internal(p_char uuid, p_delta integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_hp int; v_max int; v_tmp int; v_abs int;
begin
  select coalesce((resources->'pv'->>'current')::int, 0), coalesce((resources->'pv'->>'max')::int, 0),
         coalesce((resources->'pvtemp'->>'current')::int, 0)
    into v_hp, v_max, v_tmp from characters where id = p_char for update;
  if p_delta < 0 then
    v_abs := least(v_tmp, -p_delta); v_tmp := v_tmp - v_abs; v_hp := greatest(0, v_hp - (-p_delta - v_abs));
  elsif v_max > 0 then v_hp := least(v_max, v_hp + p_delta);
  else v_hp := v_hp + p_delta;
  end if;
  perform set_config('grimoire.allow_hp', 'on', true);
  update characters set
    resources = resources || jsonb_build_object('pv', jsonb_build_object('current', v_hp, 'max', v_max),
                                                'pvtemp', jsonb_build_object('current', v_tmp, 'max', 0)),
    sheet = case when v_hp > 0 then sheet || '{"deathSaves":{"success":0,"failure":0}}'::jsonb else sheet end,
    updated_at = now()
  where id = p_char;
  perform set_config('grimoire.allow_hp', 'off', true);
end $$;

revoke all on function public._apply_hp_internal(uuid, integer) from public, anon, authenticated;

-- apply_hp / set_temp_hp : mêmes calculs que 004, avec le droit « PV ».
create or replace function public.apply_hp(p_char uuid, p_delta integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_hp int; v_max int; v_tmp int; v_abs int;
begin
  if not public.can_edit_hp(p_char) then raise exception 'Seul le MJ peut modifier les PV'; end if;
  select coalesce((resources->'pv'->>'current')::int, 0), coalesce((resources->'pv'->>'max')::int, 0),
         coalesce((resources->'pvtemp'->>'current')::int, 0)
    into v_hp, v_max, v_tmp from characters where id = p_char for update;
  if p_delta < 0 then
    v_abs := least(v_tmp, -p_delta);
    v_tmp := v_tmp - v_abs;
    v_hp  := greatest(0, v_hp - (-p_delta - v_abs));
  elsif v_max > 0 then v_hp := least(v_max, v_hp + p_delta);
  else v_hp := v_hp + p_delta;
  end if;
  update characters set
    resources = resources || jsonb_build_object('pv', jsonb_build_object('current', v_hp, 'max', v_max),
                                                'pvtemp', jsonb_build_object('current', v_tmp, 'max', 0)),
    sheet = case when v_hp > 0 then sheet || '{"deathSaves":{"success":0,"failure":0}}'::jsonb else sheet end,
    updated_at = now()
  where id = p_char;
end $$;

grant execute on function public.apply_hp(uuid, integer) to authenticated;

create or replace function public.set_temp_hp(p_char uuid, p_value integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_hp(p_char) then raise exception 'Seul le MJ peut modifier les PV'; end if;
  update characters set
    resources = resources || jsonb_build_object('pvtemp', jsonb_build_object('current', greatest(0, p_value), 'max', 0)),
    updated_at = now()
  where id = p_char;
end $$;

grant execute on function public.set_temp_hp(uuid, integer) to authenticated;

-- Jet contre la mort (d20 naturel) : le joueur peut le faire lui-même. 20 = 1 PV, 1 = 2 échecs.
create or replace function public.death_save(p_char uuid, p_natural integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_hp int; v_max int; v_ok int; v_ko int;
begin
  if not public.can_edit_character(p_char) then raise exception 'Accès refusé'; end if;
  select coalesce((resources->'pv'->>'current')::int, 0), coalesce((resources->'pv'->>'max')::int, 0),
         coalesce((sheet->'deathSaves'->>'success')::int, 0), coalesce((sheet->'deathSaves'->>'failure')::int, 0)
    into v_hp, v_max, v_ok, v_ko from characters where id = p_char for update;
  if v_hp > 0 then return; end if;
  if p_natural >= 20 then
    perform set_config('grimoire.allow_hp', 'on', true);
    update characters set
      resources = resources || jsonb_build_object('pv', jsonb_build_object('current', 1, 'max', v_max)),
      sheet = sheet || '{"deathSaves":{"success":0,"failure":0}}'::jsonb, updated_at = now()
    where id = p_char;
    perform set_config('grimoire.allow_hp', 'off', true);
    return;
  elsif p_natural <= 1 then v_ko := least(3, v_ko + 2);
  elsif p_natural >= 10 then v_ok := least(3, v_ok + 1);
  else v_ko := least(3, v_ko + 1);
  end if;
  update characters set sheet = sheet || jsonb_build_object('deathSaves', jsonb_build_object('success', v_ok, 'failure', v_ko)),
    updated_at = now() where id = p_char;
end $$;

grant execute on function public.death_save(uuid, integer) to authenticated;

-- Pièces : le joueur peut seulement dépenser.
create or replace function public.adjust_coins(p_char uuid, p_coin text, p_delta integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_coin not in ('pc', 'pa', 'pe', 'po', 'pp') then raise exception 'Pièce inconnue'; end if;
  if not public.can_edit_inventory(p_char) then raise exception 'Accès refusé'; end if;
  if p_delta > 0 and not public.is_gm_of_char(p_char) then raise exception 'Seul le MJ donne des pièces'; end if;
  update characters set
    sheet = sheet || jsonb_build_object('coins', coalesce(sheet->'coins', '{}'::jsonb) || jsonb_build_object(p_coin,
      greatest(0, coalesce((sheet->'coins'->>p_coin)::int, 0) + p_delta))),
    updated_at = now()
  where id = p_char;
end $$;

grant execute on function public.adjust_coins(uuid, text, integer) to authenticated;

-- Actions « utiliser » autorisées au joueur : capacité, emplacement de sort, sort préparé.
create or replace function public.use_feature(p_char uuid, p_feature text)
returns void language plpgsql security definer set search_path = public as $$
declare v_list jsonb; v_new jsonb := '[]'::jsonb; v_f jsonb; v_done boolean := false;
begin
  if not public.can_edit_character(p_char) then raise exception 'Accès refusé'; end if;
  select coalesce(sheet->'features', '[]'::jsonb) into v_list from characters where id = p_char for update;
  for v_f in select * from jsonb_array_elements(v_list) loop
    if v_f->>'id' = p_feature then
      if coalesce((v_f->>'used')::int, 0) >= coalesce((v_f->>'max')::int, 0) then raise exception 'Plus d’utilisation disponible'; end if;
      v_f := v_f || jsonb_build_object('used', coalesce((v_f->>'used')::int, 0) + 1);
      v_done := true;
    end if;
    v_new := v_new || jsonb_build_array(v_f);
  end loop;
  if not v_done then raise exception 'Capacité introuvable'; end if;
  update characters set sheet = sheet || jsonb_build_object('features', v_new), updated_at = now() where id = p_char;
end $$;

grant execute on function public.use_feature(uuid, text) to authenticated;

create or replace function public.spend_slot(p_char uuid, p_level integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_slot jsonb; v_key text := p_level::text;
begin
  if not public.can_edit_character(p_char) then raise exception 'Accès refusé'; end if;
  select sheet->'spellcasting'->'slots'->v_key into v_slot from characters where id = p_char for update;
  if v_slot is null or coalesce((v_slot->>'used')::int, 0) >= coalesce((v_slot->>'max')::int, 0) then
    raise exception 'Plus d’emplacement de niveau %', p_level;
  end if;
  update characters set
    sheet = jsonb_set(sheet, array['spellcasting', 'slots', v_key, 'used'], to_jsonb(coalesce((v_slot->>'used')::int, 0) + 1)),
    updated_at = now()
  where id = p_char;
end $$;

grant execute on function public.spend_slot(uuid, integer) to authenticated;

-- Sorts préparés : le joueur respecte le maximum fixé par le MJ (spellcasting.preparedMax, 0 = libre).
create or replace function public.set_prepared(p_char uuid, p_spell text, p_prepared boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_sheet jsonb; v_max int; v_count int;
begin
  if not public.can_edit_character(p_char) then raise exception 'Accès refusé'; end if;
  select sheet into v_sheet from characters where id = p_char for update;
  v_max := coalesce((v_sheet->'spellcasting'->>'preparedMax')::int, 0);
  select count(*) into v_count from jsonb_array_elements(coalesce(v_sheet->'spells', '[]'::jsonb)) s
    where coalesce((s->>'level')::int, 0) > 0 and coalesce((s->>'prepared')::boolean, false);
  if p_prepared and v_max > 0 and v_count >= v_max and not public.is_gm_of_char(p_char) then
    raise exception 'Maximum de % sorts préparés atteint', v_max;
  end if;
  update characters set
    sheet = sheet || jsonb_build_object('spells', (
      select coalesce(jsonb_agg(case when s->>'id' = p_spell then s || jsonb_build_object('prepared', p_prepared) else s end), '[]'::jsonb)
      from jsonb_array_elements(coalesce(sheet->'spells', '[]'::jsonb)) s)),
    updated_at = now()
  where id = p_char;
end $$;

grant execute on function public.set_prepared(uuid, text, boolean) to authenticated;

-- dons (création et montée de niveau), vision dans le noir et compagnons modifiables par le joueur sur sa fiche.
--  Mêmes règles que src/lib/dnd/feats.ts et levelup.ts.

-- ---------- Fiche : le joueur gère ses compagnons et sa vision dans le noir (= PLAYER_SHEET_KEYS).
create or replace function public.patch_sheet(p_char uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_character(p_char) then raise exception 'Accès refusé'; end if;
  if not public.is_gm_of_char(p_char) then
    if exists (
      select 1 from jsonb_object_keys(p_patch) k
      where k not in ('species', 'className', 'subclass', 'background', 'alignment', 'size',
                      'abilities', 'saveProf', 'skills', 'ac', 'speed', 'initMisc', 'hitDie',
                      'conditions', 'inspiration', 'companions', 'darkvision', 'languages', 'training', 'attacks', 'concentration', 'attacksPerAction')
    ) then raise exception 'Réservé au MJ'; end if;
    -- Règle de la table « les joueurs modifient leur fiche » désactivée : seulement états, concentration, inspiration dépensée
    if exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('conditions', 'concentration', 'inspiration'))
       and not coalesce((select (c.settings->>'playersEditStats')::boolean from characters ch join campaigns c on c.id = ch.campaign_id where ch.id = p_char), true) then
      raise exception 'Le MJ a bloqué les modifications de fiche';
    end if;
    if coalesce((p_patch->>'inspiration')::boolean, false) then raise exception 'Seul le MJ donne l’inspiration'; end if;
    if p_patch ? 'conditions' and exists (
      select 1 from characters ch, jsonb_array_elements_text(coalesce(ch.sheet->'conditions', '[]'::jsonb)) k(v)
      where ch.id = p_char and not coalesce(p_patch->'conditions', '[]'::jsonb) ? k.v
    ) then raise exception 'Seul le MJ retire un état'; end if;
  end if;
  update characters set sheet = sheet || p_patch, updated_at = now() where id = p_char;
end $$;

grant execute on function public.patch_sheet(uuid, jsonb) to authenticated;

-- compte du joueur — changer son pseudo partout (nom affiché dans toutes ses campagnes).
-- Le reste (mot de passe oublié, lien de connexion par email, nouveau mot de passe) est géré par Supabase Auth.
create or replace function public.set_display_name(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(p_name)) > 40 then raise exception 'Pseudo invalide'; end if;
  update members set display_name = trim(p_name) where user_id = auth.uid();
end $$;

grant execute on function public.set_display_name(text) to authenticated;

-- ================================ 04_niveaux_dons.sql ================================
-- 04 : Montée de niveau (emplacements, dons), annulation par le MJ.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- montée de niveau par le joueur (level_up, vérifiée) et nouveaux éléments de carte (portes verrouillées,
-- objets, murs).

-- Emplacements de sorts par classe et niveau (= suggestedSlots, src/lib/dnd/spells.ts).
create or replace function public._slots_for(p_class text, p_level integer) returns jsonb language plpgsql immutable as $$
declare
  v_full jsonb := '[[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]]';
  v_row jsonb; v_out jsonb := '{}'; v_i int;
begin
  if p_class = 'Occultiste' then
    return jsonb_build_object(
      case when p_level >= 11 then '5' else least(5, ceil(p_level / 2.0))::int::text end,
      jsonb_build_object('max', case when p_level >= 17 then 4 when p_level >= 11 then 3 when p_level = 1 then 1 else 2 end, 'used', 0));
  end if;
  if p_class in ('Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien') then v_row := v_full->(p_level - 1);
  elsif p_class in ('Paladin', 'Rôdeur') then v_row := v_full->(ceil(p_level / 2.0)::int - 1);
  else return null; end if;
  for v_i in 0..jsonb_array_length(v_row) - 1 loop
    v_out := v_out || jsonb_build_object((v_i + 1)::text, jsonb_build_object('max', v_row->v_i, 'used', 0));
  end loop;
  return v_out;
end $$;

-- ---------- Dons (recopiés de src/lib/dnd/srd/feats.ts, généré par scripts/gen-dons-sql.ts ; test de parité).
create or replace function public._feat_info(p_name text) returns jsonb language sql immutable as $$
  select ('{"Vigilant":{"initProf":true},"Artisan":{},"Bagarreur de taverne":{"unarmed":true},"Chanceux":{"usesProf":true},"Doué":{"skills":3},"Guérisseur":{},"Initié à la magie":{"spellsOf":true},"Musicien":{},"Robuste":{"hpPerLevel":2},"Attaquant sauvage":{},"Résilient":{"plus":["str","dex","con","int","wis","cha"],"saveOfPlus":true},"Mage de guerre":{"plus":["int","wis","cha"],"concAdv":true},"Mobile":{"plus":["dex","con"],"speed":3},"Sentinelle":{"plus":["str","dex"]},"Tireur d’élite":{"plus":["dex"]},"Maître des armes lourdes":{"plus":["str"]},"Maître des boucliers":{"plus":["str"]},"Combattant à deux armes":{"plus":["str","dex"]},"Athlète":{"plus":["str","dex"]},"Observateur":{"plus":["int","wis"]}}'::jsonb)->regexp_replace(trim(coalesce(p_name, '')), '\s*\(.*\)\s*$', '')
$$;

-- Mage de guerre : avantage aux sauvegardes de concentration.
create or replace function public._has_conc_adv(p_sheet jsonb) returns boolean language sql immutable as $$
  select exists (select 1 from jsonb_array_elements_text(coalesce(p_sheet->'feats', '[]'::jsonb)) f
                 where coalesce((public._feat_info(f)->>'concAdv')::boolean, false))
$$;

-- Monter d'un niveau (joueur propriétaire ou MJ). Mêmes vérifications que checkLevelUp (src/lib/dnd/levelup.ts) :
-- +1 niveau, PV gagnés plausibles, amélioration de caractéristiques seulement aux bons niveaux (+2 au total, 20 max),
-- expertise seulement sur des compétences maîtrisées, sorts anciens conservés. Emplacements recalculés ici.
create or replace function public._level_up_core(p_char uuid, p_patch jsonb, p_hp integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_c characters; v_s jsonb; v_class text; v_old int; v_new int; v_die int; v_con int; v_max int; v_asi boolean;
  v_sum int := 0; v_k text; v_d int; v_slots jsonb; v_new_slots jsonb := '{}'; v_l text; v_added int; v_maxlvl int := 0; v_exp int := 0;
begin
  select * into v_c from characters where id = p_char for update;
  if not found then raise exception 'Personnage introuvable'; end if;
  if not public.is_gm_of_char(p_char) and v_c.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton personnage'; end if;
  if exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('level', 'abilities', 'skills', 'features', 'attacksPerAction', 'spellcasting', 'spells')) then
    raise exception 'Montée de niveau invalide';
  end if;
  v_s := coalesce(v_c.sheet, '{}'::jsonb);
  v_class := coalesce(v_s->>'className', '');
  v_old := coalesce((v_s->>'level')::int, 1);
  v_new := (p_patch->>'level')::int;
  if v_old >= 20 or v_new is distinct from v_old + 1 then raise exception 'On monte d’un seul niveau à la fois (20 au plus)'; end if;
  v_die := case v_class when 'Barbare' then 12 when 'Guerrier' then 10 when 'Paladin' then 10 when 'Rôdeur' then 10
                        when 'Ensorceleur' then 6 when 'Magicien' then 6 else coalesce((v_s->>'hitDie')::int, 8) end;
  v_con := floor((coalesce((v_s->'abilities'->>'con')::int, 10) - 10) / 2.0)::int;
  v_max := v_die + greatest(0, v_con + case when v_s->>'species' = 'Nain' then 1 else 0 end);
  if p_hp < 1 or p_hp > v_max then raise exception 'PV gagnés impossibles'; end if;

  v_asi := v_new in (4, 8, 12, 16) or (v_class = 'Guerrier' and v_new in (6, 14)) or (v_class = 'Roublard' and v_new = 10);
  if p_patch ? 'abilities' then
    foreach v_k in array array['str', 'dex', 'con', 'int', 'wis', 'cha'] loop
      v_d := coalesce((p_patch->'abilities'->>v_k)::int, 10) - coalesce((v_s->'abilities'->>v_k)::int, 10);
      if v_d < 0 or coalesce((p_patch->'abilities'->>v_k)::int, 10) > 20 then raise exception 'Caractéristiques invalides'; end if;
      v_sum := v_sum + v_d;
    end loop;
    if v_sum > (case when v_asi then 2 else 0 end) then raise exception 'Pas d’amélioration de caractéristiques à ce niveau'; end if;
  end if;

  if p_patch ? 'skills' then
    for v_k in select jsonb_object_keys(p_patch->'skills') loop
      if coalesce(p_patch->'skills'->>v_k, '0') is distinct from coalesce(v_s->'skills'->>v_k, '0') then
        if coalesce(v_s->'skills'->>v_k, '0') <> '1' or p_patch->'skills'->>v_k <> '2' then raise exception 'Expertise invalide'; end if;
        v_exp := v_exp + 1;
      end if;
    end loop;
    if v_exp > 2 then raise exception 'Expertise invalide'; end if;
  end if;

  -- Emplacements recalculés (on garde les emplacements déjà dépensés)
  v_slots := public._slots_for(v_class, v_new);
  if v_slots is not null then
    for v_l in select jsonb_object_keys(v_slots) loop
      v_new_slots := v_new_slots || jsonb_build_object(v_l, jsonb_build_object('max', (v_slots->v_l->>'max')::int,
        'used', least((v_slots->v_l->>'max')::int, coalesce((v_s->'spellcasting'->'slots'->v_l->>'used')::int, 0))));
      v_maxlvl := greatest(v_maxlvl, v_l::int);
    end loop;
    p_patch := jsonb_set(p_patch, '{spellcasting}', coalesce(v_s->'spellcasting', '{}'::jsonb) || coalesce(p_patch->'spellcasting', '{}'::jsonb)
      || jsonb_build_object('slots', v_new_slots));
  elsif p_patch ? 'spellcasting' then
    p_patch := jsonb_set(p_patch, '{spellcasting}', coalesce(v_s->'spellcasting', '{}'::jsonb) || jsonb_build_object('preparedMax', p_patch->'spellcasting'->'preparedMax'));
  end if;

  if p_patch ? 'spells' then
    if exists (select 1 from jsonb_array_elements(coalesce(v_s->'spells', '[]'::jsonb)) o
               where not exists (select 1 from jsonb_array_elements(p_patch->'spells') n where n->>'id' = o->>'id')) then
      raise exception 'Sorts invalides';
    end if;
    select count(*) into v_added from jsonb_array_elements(p_patch->'spells') n
      where not exists (select 1 from jsonb_array_elements(coalesce(v_s->'spells', '[]'::jsonb)) o where o->>'id' = n->>'id');
    if v_added > 8 or exists (select 1 from jsonb_array_elements(p_patch->'spells') n
        where (n->>'level')::int > v_maxlvl and not exists (select 1 from jsonb_array_elements(coalesce(v_s->'spells', '[]'::jsonb)) o where o->>'id' = n->>'id')) then
      raise exception 'Trop de sorts ou niveau trop élevé';
    end if;
  end if;
  if coalesce((p_patch->>'attacksPerAction')::int, 1) > 4 then raise exception 'Montée de niveau invalide'; end if;

  perform set_config('grimoire.allow_hp', 'on', true);
  update characters set
    sheet = v_s || p_patch,
    resources = jsonb_set(coalesce(resources, '{}'::jsonb), '{pv}', jsonb_build_object(
      'max', coalesce((resources->'pv'->>'max')::int, 0) + p_hp, 'current', coalesce((resources->'pv'->>'current')::int, 0) + p_hp)),
    updated_at = now()
  where id = p_char;
  perform set_config('grimoire.allow_hp', 'off', true);
end $$;

revoke all on function public._level_up_core(uuid, jsonb, integer) from public, anon, authenticated;

-- ---------- Montée de niveau : en plus, un don à la place de l'amélioration (= checkFeatLevelUp).
create or replace function public.level_up(p_char uuid, p_patch jsonb, p_hp integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_c characters; v_s jsonb; v_level int; v_allowed int; v_new int; v_sub text; v_before jsonb; v_hist jsonb;
  v_class text; v_asi boolean; v_old_feats jsonb; v_added text[]; v_feat jsonb := null; v_k text; v_sum int := 0;
  v_learned jsonb := '{}'; v_core jsonb; v_bonus int := 0; v_extra text[];
begin
  select * into v_c from characters where id = p_char for update;
  if not found then raise exception 'Personnage introuvable'; end if;
  v_s := coalesce(v_c.sheet, '{}'::jsonb);
  v_level := coalesce((v_s->>'level')::int, 1);
  v_allowed := least(20, greatest(v_level, coalesce((v_s->>'allowedLevel')::int, v_level)));
  v_new := (p_patch->>'level')::int;
  if not public.is_gm_of_char(p_char) and v_new > v_allowed then raise exception 'Le MJ ne t’a pas encore accordé ce niveau'; end if;
  if p_patch ? 'subclass' then
    v_sub := trim(p_patch->>'subclass');
    if coalesce(v_s->>'subclass', '') <> '' or v_new < 3 or v_sub = '' or length(v_sub) > 80 then raise exception 'Sous-classe invalide'; end if;
  end if;
  v_class := coalesce(v_s->>'className', '');
  v_asi := v_new in (4, 8, 12, 16) or (v_class = 'Guerrier' and v_new in (6, 14)) or (v_class = 'Roublard' and v_new = 10);

  -- Dons
  v_old_feats := coalesce(v_s->'feats', '[]'::jsonb);
  if p_patch ? 'feats' then
    if exists (select 1 from jsonb_array_elements_text(v_old_feats) o where not (p_patch->'feats') ? o) then raise exception 'Dons invalides'; end if;
    select array_agg(n) into v_added from jsonb_array_elements_text(p_patch->'feats') n where not v_old_feats ? n;
    if coalesce(array_length(v_added, 1), 0) > 1 or (coalesce(array_length(v_added, 1), 0) = 1 and not v_asi) then raise exception 'Pas de don à ce niveau'; end if;
    if coalesce(array_length(v_added, 1), 0) = 1 then
      v_feat := public._feat_info(v_added[1]);
      if v_feat is null or coalesce((v_feat->>'spellsOf')::boolean, false)
         or exists (select 1 from jsonb_array_elements_text(v_old_feats) o where public._feat_info(o) = v_feat and regexp_replace(o, '\s*\(.*\)\s*$', '') = regexp_replace(v_added[1], '\s*\(.*\)\s*$', '')) then
        raise exception 'Don invalide';
      end if;
    end if;
  end if;
  if p_patch ? 'speed' and (p_patch->>'speed')::numeric <> coalesce((v_s->>'speed')::numeric, 9) + coalesce((v_feat->>'speed')::numeric, 0) then raise exception 'Vitesse invalide'; end if;
  if p_patch ? 'attacks' and not coalesce((v_feat->>'unarmed')::boolean, false) then raise exception 'Montée de niveau invalide'; end if;
  if p_patch ? 'abilities' and v_feat is not null then
    foreach v_k in array array['str', 'dex', 'con', 'int', 'wis', 'cha'] loop
      v_sum := v_sum + greatest(0, coalesce((p_patch->'abilities'->>v_k)::int, 10) - coalesce((v_s->'abilities'->>v_k)::int, 10));
    end loop;
    if v_sum > 1 then raise exception 'Pas d’amélioration de caractéristiques à ce niveau'; end if;
  end if;
  if p_patch ? 'saveProf' then
    select array_agg(a) into v_extra from jsonb_array_elements_text(p_patch->'saveProf') a where not coalesce(v_s->'saveProf', '[]'::jsonb) ? a;
    if exists (select 1 from jsonb_array_elements_text(coalesce(v_s->'saveProf', '[]'::jsonb)) o where not (p_patch->'saveProf') ? o)
       or coalesce(array_length(v_extra, 1), 0) > (case when coalesce((v_feat->>'saveOfPlus')::boolean, false) then 1 else 0 end)
       or (coalesce(array_length(v_extra, 1), 0) = 1 and coalesce((p_patch->'abilities'->>v_extra[1])::int, 0) <= coalesce((v_s->'abilities'->>v_extra[1])::int, 10)) then
      raise exception 'Sauvegardes invalides';
    end if;
  end if;
  -- Compétences apprises par le don (Doué) : retirées du contrôle de l'expertise, vérifiées ici
  if p_patch ? 'skills' then
    select coalesce(jsonb_object_agg(k, 1), '{}'::jsonb) into v_learned from jsonb_object_keys(p_patch->'skills') k
      where coalesce((v_s->'skills'->>k)::int, 0) = 0 and (p_patch->'skills'->>k)::int = 1;
    if (select count(*) from jsonb_object_keys(v_learned)) > coalesce((v_feat->>'skills')::int, 0) then raise exception 'Expertise invalide'; end if;
  end if;
  -- PV : Robuste déjà pris (+2) et nouveau Robuste (+2 × niveau), en plus du dé de vie
  select coalesce(sum(coalesce((public._feat_info(f)->>'hpPerLevel')::int, 0)), 0) into v_bonus from jsonb_array_elements_text(v_old_feats) f;
  v_bonus := v_bonus + coalesce((v_feat->>'hpPerLevel')::int, 0) * v_new;

  v_before := (select coalesce(jsonb_object_agg(k, v_s->k), '{}'::jsonb) from unnest(array['level', 'subclass', 'abilities', 'skills', 'features',
    'attacksPerAction', 'spellcasting', 'feats', 'speed', 'saveProf', 'attacks']) k where v_s ? k) || jsonb_build_object('subclass', coalesce(v_s->>'subclass', ''),
    'feats', coalesce(v_s->'feats', '[]'::jsonb), 'saveProf', coalesce(v_s->'saveProf', '[]'::jsonb), 'attacks', coalesce(v_s->'attacks', '[]'::jsonb), 'speed', coalesce(v_s->'speed', '9'::jsonb))
    -- Sorts : seulement leurs identifiants (historique léger) = pushHistory
    || jsonb_build_object('spellIds', coalesce((select jsonb_agg(x->'id') from jsonb_array_elements(coalesce(v_s->'spells', '[]'::jsonb)) x), '[]'::jsonb));
  v_core := p_patch - 'subclass' - 'feats' - 'speed' - 'saveProf' - 'attacks';
  if p_patch ? 'skills' then
    v_core := jsonb_set(v_core, '{skills}', (p_patch->'skills') || (select coalesce(jsonb_object_agg(k, coalesce(v_s->'skills'->k, '0'::jsonb)), '{}'::jsonb) from jsonb_object_keys(v_learned) k));
  end if;
  perform public._level_up_core(p_char, v_core, p_hp - v_bonus);
  v_hist := coalesce(v_s->'levelHistory', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('from', v_level, 'hpGain', p_hp, 'before', v_before));
  v_hist := (select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from jsonb_array_elements(v_hist) with ordinality t(e, i)
             where i > jsonb_array_length(v_hist) - 3);
  perform set_config('grimoire.allow_hp', 'on', true);
  update characters set sheet = sheet || jsonb_build_object('allowedLevel', greatest(v_allowed, v_new), 'levelHistory', v_hist)
      || case when v_sub is not null then jsonb_build_object('subclass', v_sub) else '{}'::jsonb end
      || (p_patch - 'level' - 'subclass' - 'abilities' - 'skills' - 'features' - 'attacksPerAction' - 'spellcasting' - 'spells')
      || case when v_learned <> '{}'::jsonb then jsonb_build_object('skills', coalesce(sheet->'skills', '{}'::jsonb) || v_learned) else '{}'::jsonb end,
    resources = case when v_bonus > 0 then jsonb_set(resources, '{pv}', jsonb_build_object(
      'max', coalesce((resources->'pv'->>'max')::int, 0) + v_bonus, 'current', coalesce((resources->'pv'->>'current')::int, 0) + v_bonus)) else resources end
  where id = p_char;
  perform set_config('grimoire.allow_hp', 'off', true);
end $$;

grant execute on function public.level_up(uuid, jsonb, integer) to authenticated;

grant execute on function public.level_up(uuid, jsonb, integer) to authenticated;

grant execute on function public.level_up(uuid, jsonb, integer) to authenticated;

-- ---------- MJ : −1 niveau (= levelDownPatch). Niveau accordé non pris → retiré ; sinon dernière montée annulée
-- (fiche d'avant, PV gagnés retirés) ; sans historique, niveau −1 et emplacements recalculés.
create or replace function public.level_down(p_char uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_s jsonb; v_level int; v_allowed int; v_hist jsonb; v_last jsonb; v_slots jsonb; v_new_slots jsonb := '{}'; v_l text;
  v_loss int := 0; v_max int;
begin
  if not public.is_gm_of_char(p_char) then raise exception 'Réservé au MJ'; end if;
  select coalesce(sheet, '{}'::jsonb) into v_s from characters where id = p_char for update;
  v_level := coalesce((v_s->>'level')::int, 1);
  v_allowed := least(20, greatest(v_level, coalesce((v_s->>'allowedLevel')::int, v_level)));
  if v_allowed > v_level then
    update characters set sheet = sheet || jsonb_build_object('allowedLevel', v_allowed - 1), updated_at = now() where id = p_char;
    return;
  end if;
  if v_level <= 1 then raise exception 'Déjà niveau 1'; end if;
  v_hist := coalesce(v_s->'levelHistory', '[]'::jsonb);
  v_last := v_hist->-1;
  if v_last is not null and (v_last->>'from')::int = v_level - 1 then
    v_loss := coalesce((v_last->>'hpGain')::int, 0);
    -- Sorts appris à ce niveau retirés (les autres gardent leur état) ; anciens historiques : sorts complets
    if v_last->'before' ? 'spellIds' then
      v_s := v_s || jsonb_build_object('spells', coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(v_s->'spells', '[]'::jsonb)) x
        where v_last->'before'->'spellIds' ? (x->>'id')), '[]'::jsonb));
    end if;
    v_s := v_s || (coalesce(v_last->'before', '{}'::jsonb) - 'spellIds') || jsonb_build_object('level', v_level - 1, 'allowedLevel', v_level - 1,
      'levelHistory', v_hist - (jsonb_array_length(v_hist) - 1));
  else
    v_slots := public._slots_for(coalesce(v_s->>'className', ''), v_level - 1);
    if v_slots is not null then
      for v_l in select jsonb_object_keys(v_slots) loop
        v_new_slots := v_new_slots || jsonb_build_object(v_l, jsonb_build_object('max', (v_slots->v_l->>'max')::int,
          'used', least((v_slots->v_l->>'max')::int, coalesce((v_s->'spellcasting'->'slots'->v_l->>'used')::int, 0))));
      end loop;
      v_s := jsonb_set(v_s, '{spellcasting}', coalesce(v_s->'spellcasting', '{}'::jsonb) || jsonb_build_object('slots', v_new_slots));
    end if;
    v_s := v_s || jsonb_build_object('level', v_level - 1, 'allowedLevel', v_level - 1, 'levelHistory', '[]'::jsonb);
  end if;
  perform set_config('grimoire.allow_hp', 'on', true);
  update characters set sheet = v_s,
    resources = case when v_loss > 0 then jsonb_set(coalesce(resources, '{}'::jsonb), '{pv}', jsonb_build_object(
      'max', greatest(1, coalesce((resources->'pv'->>'max')::int, 0) - v_loss),
      'current', least(coalesce((resources->'pv'->>'current')::int, 0), greatest(1, coalesce((resources->'pv'->>'max')::int, 0) - v_loss))))
      else resources end,
    updated_at = now()
  where id = p_char;
  perform set_config('grimoire.allow_hp', 'off', true);
end $$;

grant execute on function public.level_down(uuid) to authenticated;

-- ================================ 05_objets.sql ================================
-- 05 : Objets : donner, échanger, utiliser, acheter, vendre, déposer dans un coffre.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- Objets : seul le MJ en crée (give_item) ; le joueur peut réduire la quantité, équiper, jeter, donner.
create or replace function public.give_item(p_char uuid, p_name text, p_qty integer, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare v_campaign uuid; v_existing uuid;
begin
  if not public.is_gm_of_char(p_char) then raise exception 'Seul le MJ donne des objets'; end if;
  select campaign_id into v_campaign from characters where id = p_char;
  select id into v_existing from items
    where character_id = p_char and lower(name) = lower(trim(p_name)) and description = coalesce(p_description, '') limit 1;
  if v_existing is not null then
    update items set qty = qty + greatest(1, p_qty) where id = v_existing;
  else
    insert into items (campaign_id, character_id, name, qty, description)
      values (v_campaign, p_char, trim(p_name), greatest(1, p_qty), coalesce(p_description, ''));
  end if;
end $$;

grant execute on function public.give_item(uuid, text, integer, text) to authenticated;

-- transfer_item : le joueur peut donner un objet à un autre perso (fusion autorisée côté destinataire).
create or replace function public.transfer_item(p_item uuid, p_to uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_item items; v_n integer; v_dest uuid;
begin
  select * into v_item from items where id = p_item for update;
  if not found then raise exception 'Objet introuvable'; end if;
  if not public.can_edit_inventory(v_item.character_id) then raise exception 'Accès refusé'; end if;
  if not exists (select 1 from characters where id = p_to and campaign_id = v_item.campaign_id) then
    raise exception 'Destinataire invalide';
  end if;
  perform set_config('grimoire.allow_items', 'on', true);
  v_n := least(greatest(1, p_qty), v_item.qty);
  select id into v_dest from items where character_id = p_to and lower(name) = lower(v_item.name) and description = v_item.description limit 1;
  if v_dest is not null then update items set qty = qty + v_n where id = v_dest;
  else insert into items (campaign_id, character_id, name, qty, description) values (v_item.campaign_id, p_to, v_item.name, v_n, v_item.description);
  end if;
  if v_item.qty - v_n <= 0 then delete from items where id = p_item; else update items set qty = qty - v_n where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);
end $$;

grant execute on function public.transfer_item(uuid, uuid, integer) to authenticated;

-- Objet de soin (potion) : −1 exemplaire et PV rendus au porteur ou à une cible de la campagne.
create or replace function public.use_item(p_item uuid, p_heal integer, p_target uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_item items; v_target uuid;
begin
  select * into v_item from items where id = p_item for update;
  if not found or v_item.qty < 1 then raise exception 'Objet introuvable'; end if;
  if not (public.is_gm_of_char(v_item.character_id)
          or exists (select 1 from characters where id = v_item.character_id and owner_id = auth.uid())) then
    raise exception 'Ce n’est pas ton objet';
  end if;
  v_target := coalesce(p_target, v_item.character_id);
  if not exists (select 1 from characters where id = v_target and campaign_id = v_item.campaign_id) then
    raise exception 'Cible invalide';
  end if;
  perform set_config('grimoire.allow_items', 'on', true);
  if v_item.qty <= 1 then delete from items where id = p_item; else update items set qty = qty - 1 where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);
  perform public._apply_hp_internal(v_target, greatest(0, p_heal));
end $$;

grant execute on function public.use_item(uuid, integer, uuid) to authenticated;

-- Paie p_price (pc) avec une bourse {pp,po,pe,pa,pc} : garde les plus grosses pièces, rend la monnaie en po/pa/pc.
-- = payCoins (src/lib/dnd/shop.ts).
create or replace function public._pay_coins(p_coins jsonb, p_price integer)
returns jsonb language plpgsql immutable as $$
declare
  v_keys text[] := array['pp', 'po', 'pe', 'pa', 'pc'];
  v_vals int[] := array[1000, 100, 50, 10, 1];
  v_total bigint := 0; v_rest bigint; v_out jsonb := '{}'; v_n bigint; v_i int;
begin
  for v_i in 1..5 loop v_total := v_total + coalesce((p_coins->>v_keys[v_i])::bigint, 0) * v_vals[v_i]; end loop;
  if p_price > v_total then raise exception 'Pas assez d’argent'; end if;
  v_rest := v_total - p_price;
  for v_i in 1..5 loop
    v_n := least(coalesce((p_coins->>v_keys[v_i])::bigint, 0), v_rest / v_vals[v_i]);
    v_out := v_out || jsonb_build_object(v_keys[v_i], v_n);
    v_rest := v_rest - v_n * v_vals[v_i];
  end loop;
  for v_i in 2..5 loop
    continue when v_keys[v_i] = 'pe';
    v_n := v_rest / v_vals[v_i];
    v_out := v_out || jsonb_build_object(v_keys[v_i], (v_out->>v_keys[v_i])::bigint + v_n);
    v_rest := v_rest - v_n * v_vals[v_i];
  end loop;
  return v_out;
end $$;

-- Achat (marchand) ou prise (coffre) : vérifie droits, visibilité et stock, paie, retire du stock, ajoute au sac.
create or replace function public.buy_item(p_item uuid, p_character uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_it shop_items; v_shop shops; v_char characters; v_gm boolean; v_coins jsonb; v_same uuid;
begin
  select * into v_it from shop_items where id = p_item for update;
  if not found then raise exception 'Objet introuvable'; end if;
  select * into v_shop from shops where id = v_it.shop_id;
  select * into v_char from characters where id = p_character for update;
  if v_char.id is null or v_char.campaign_id <> v_shop.campaign_id then raise exception 'Objet introuvable'; end if;
  v_gm := public.is_gm(v_shop.campaign_id);
  if not v_gm and v_char.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton personnage'; end if;
  if not v_gm and not v_shop.visible then raise exception 'Ce marchand n’est pas disponible'; end if;
  if p_qty < 1 or p_qty > v_it.qty then raise exception 'Quantité indisponible'; end if;

  if v_shop.kind = 'merchant' then
    v_coins := public._pay_coins(coalesce(v_char.sheet->'coins', '{}'::jsonb), v_it.price_cp * p_qty);
    update characters set sheet = jsonb_set(coalesce(sheet, '{}'::jsonb), '{coins}', v_coins), updated_at = now() where id = p_character;
  end if;

  if v_it.qty - p_qty <= 0 then delete from shop_items where id = p_item;
  else update shop_items set qty = qty - p_qty where id = p_item; end if;

  perform set_config('grimoire.allow_items', 'on', true);
  select id into v_same from items where character_id = p_character and lower(name) = lower(v_it.name) and description = v_it.description limit 1;
  if v_same is not null then update items set qty = qty + p_qty where id = v_same;
  else insert into items (campaign_id, character_id, name, qty, description, heal)
       values (v_it.campaign_id, p_character, v_it.name, p_qty, v_it.description, coalesce(v_it.heal, '')); end if;
  perform set_config('grimoire.allow_items', 'off', true);
end $$;

grant execute on function public.buy_item(uuid, uuid, integer) to authenticated;

-- Vente : moitié de la valeur (prix du marchand pour le même objet, sinon bibliothèque) ; l'objet passe au marchand.
-- = sellItem (src/data/localShopOps.ts), addCoins / resalePrice (src/lib/dnd/shop.ts).
create or replace function public.sell_item(p_item uuid, p_shop uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_it items; v_shop shops; v_char characters; v_gm boolean; v_value int; v_gain bigint; v_coins jsonb; v_same uuid;
begin
  select * into v_it from items where id = p_item for update;
  select * into v_shop from shops where id = p_shop;
  if v_it.id is null or v_shop.id is null or v_shop.kind <> 'merchant' or v_it.campaign_id <> v_shop.campaign_id then
    raise exception 'Vente impossible';
  end if;
  select * into v_char from characters where id = v_it.character_id for update;
  v_gm := public.is_gm(v_shop.campaign_id);
  if not v_gm and v_char.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton objet'; end if;
  if not v_gm and (not v_shop.visible or not v_shop.buys) then raise exception 'Ce marchand n’achète rien'; end if;
  if p_qty < 1 or p_qty > v_it.qty then raise exception 'Quantité indisponible'; end if;
  select price_cp into v_value from shop_items where shop_id = p_shop and lower(name) = lower(v_it.name) limit 1;
  v_value := coalesce(v_value, public._library_price(v_it.name));
  if v_value is null or v_value / 2 < 1 then raise exception 'Le marchand n’achète pas cet objet'; end if;
  v_gain := (v_value / 2)::bigint * p_qty;

  v_coins := coalesce(v_char.sheet->'coins', '{}'::jsonb);
  v_coins := v_coins || jsonb_build_object(
    'po', coalesce((v_coins->>'po')::bigint, 0) + v_gain / 100,
    'pa', coalesce((v_coins->>'pa')::bigint, 0) + (v_gain % 100) / 10,
    'pc', coalesce((v_coins->>'pc')::bigint, 0) + v_gain % 10);
  update characters set sheet = jsonb_set(coalesce(sheet, '{}'::jsonb), '{coins}', v_coins), updated_at = now() where id = v_char.id;

  perform set_config('grimoire.allow_items', 'on', true);
  if v_it.qty - p_qty <= 0 then delete from items where id = p_item; else update items set qty = qty - p_qty where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);

  select id into v_same from shop_items where shop_id = p_shop and lower(name) = lower(v_it.name) limit 1;
  if v_same is not null then update shop_items set qty = qty + p_qty where id = v_same;
  else insert into shop_items (shop_id, campaign_id, name, qty, price_cp, description, heal)
       values (p_shop, v_shop.campaign_id, v_it.name, p_qty, v_value, v_it.description, nullif(v_it.heal, '')); end if;
end $$;

grant execute on function public.sell_item(uuid, uuid, integer) to authenticated;

-- ---------- Dépôt dans un coffre (joueur : coffre visible ; MJ : tout coffre), gratuit.
create or replace function public.deposit_item(p_item uuid, p_shop uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_it items; v_shop shops; v_char characters; v_same uuid;
begin
  select * into v_it from items where id = p_item for update;
  select * into v_shop from shops where id = p_shop;
  select * into v_char from characters where id = v_it.character_id;
  if v_it.id is null or v_shop.id is null or v_shop.kind <> 'chest' or v_char.campaign_id <> v_shop.campaign_id then raise exception 'Dépôt impossible'; end if;
  if not public.is_gm(v_shop.campaign_id) then
    if v_char.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton objet'; end if;
    if not v_shop.visible then raise exception 'Ce coffre n’est pas disponible'; end if;
  end if;
  if p_qty < 1 or p_qty > v_it.qty then raise exception 'Quantité indisponible'; end if;
  perform set_config('grimoire.allow_items', 'on', true);
  if v_it.qty - p_qty <= 0 then delete from items where id = p_item; else update items set qty = qty - p_qty where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);
  select id into v_same from shop_items where shop_id = p_shop and lower(name) = lower(v_it.name) and description = v_it.description limit 1;
  if v_same is not null then update shop_items set qty = qty + p_qty where id = v_same;
  else insert into shop_items (shop_id, campaign_id, name, qty, price_cp, description, heal)
       values (p_shop, v_shop.campaign_id, v_it.name, p_qty, coalesce(public._library_price(v_it.name), 0), v_it.description, v_it.heal);
  end if;
end $$;

grant execute on function public.deposit_item(uuid, uuid, integer) to authenticated;

-- ================================ 06_equipement.sql ================================
-- 06 : Équipement : effets des objets de la bibliothèque (CA, caracs, armes), prix, emplacements, deux mains.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- ---------- Bibliothèque d'objets (généré par scripts/gen-objets-sql.ts).
create or replace function public._item_effects(p_name text) returns jsonb language sql immutable as $$
  select ('{"Dague":{"weapon":{"damage":"1d4","type":"perforant","ability":"finesse","range":1.5}},"Bâton":{"weapon":{"damage":"1d6","type":"contondant","ability":"str","range":1.5}},"Masse d’armes":{"weapon":{"damage":"1d6","type":"contondant","ability":"str","range":1.5}},"Lance":{"weapon":{"damage":"1d6","type":"perforant","ability":"str","range":1.5}},"Hachette":{"weapon":{"damage":"1d6","type":"tranchant","ability":"str","range":1.5}},"Épée courte":{"weapon":{"damage":"1d6","type":"perforant","ability":"finesse","range":1.5}},"Cimeterre":{"weapon":{"damage":"1d6","type":"tranchant","ability":"finesse","range":1.5}},"Rapière":{"weapon":{"damage":"1d8","type":"perforant","ability":"finesse","range":1.5}},"Épée longue":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5}},"Hache d’armes":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5}},"Marteau de guerre":{"weapon":{"damage":"1d8","type":"contondant","ability":"str","range":1.5}},"Morgenstern":{"weapon":{"damage":"1d8","type":"perforant","ability":"str","range":1.5}},"Coutille":{"weapon":{"damage":"1d10","type":"tranchant","ability":"str","range":3}},"Épée à deux mains":{"weapon":{"damage":"2d6","type":"tranchant","ability":"str","range":1.5}},"Hache à deux mains":{"weapon":{"damage":"1d12","type":"tranchant","ability":"str","range":1.5}},"Arc court":{"weapon":{"damage":"1d6","type":"perforant","ability":"dex","range":24}},"Arc long":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":45}},"Arbalète légère":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":24}},"Arbalète lourde":{"weapon":{"damage":"1d10","type":"perforant","ability":"dex","range":30}},"Armure matelassée":{"armor":{"base":11,"dexMax":null}},"Armure de cuir":{"armor":{"base":11,"dexMax":null}},"Armure de cuir clouté":{"armor":{"base":12,"dexMax":null}},"Armure de peau":{"armor":{"base":12,"dexMax":2}},"Chemise de mailles":{"armor":{"base":13,"dexMax":2}},"Cuirasse":{"armor":{"base":14,"dexMax":2}},"Demi-plate":{"armor":{"base":15,"dexMax":2}},"Cotte de mailles":{"armor":{"base":16,"dexMax":0}},"Harnois":{"armor":{"base":18,"dexMax":0}},"Bouclier":{"shield":2},"Dague +1":{"weapon":{"damage":"1d4","type":"perforant","ability":"finesse","range":1.5,"bonus":1}},"Épée longue +1":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":1}},"Rapière +1":{"weapon":{"damage":"1d8","type":"perforant","ability":"finesse","range":1.5,"bonus":1}},"Hache d’armes +1":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":1}},"Masse d’armes +1":{"weapon":{"damage":"1d6","type":"contondant","ability":"str","range":1.5,"bonus":1}},"Arc long +1":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":45,"bonus":1}},"Épée longue +2":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":2}},"Épée à deux mains +2":{"weapon":{"damage":"2d6","type":"tranchant","ability":"str","range":1.5,"bonus":2}},"Armure de cuir +1":{"armor":{"base":11,"dexMax":null},"ac":1},"Chemise de mailles +1":{"armor":{"base":13,"dexMax":2},"ac":1},"Cotte de mailles +1":{"armor":{"base":16,"dexMax":0},"ac":1},"Bouclier +1":{"shield":2,"ac":1},"Bouclier +2":{"shield":2,"ac":2},"Bouclier +3":{"shield":2,"ac":3},"Armure de cuir clouté +2":{"armor":{"base":12,"dexMax":null},"ac":2},"Demi-plate +1":{"armor":{"base":15,"dexMax":2},"ac":1},"Harnois +1":{"armor":{"base":18,"dexMax":0},"ac":1},"Arc long +2":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":45,"bonus":2}},"Épée longue +3":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":3}},"Pierre de Ioun (protection)":{"ac":1},"Ceinturon de force de géant des collines":{"setAbility":{"str":21}},"Ceinturon de force de géant du givre":{"setAbility":{"str":23}},"Ceinturon de force de géant du feu":{"setAbility":{"str":25}},"Ceinturon de force de géant des nuages":{"setAbility":{"str":27}},"Ceinturon de force de géant des tempêtes":{"setAbility":{"str":29}},"Cape de protection":{"ac":1,"saves":1},"Anneau de protection":{"ac":1,"saves":1},"Pierre porte-bonheur":{"saves":1},"Bracelets de défense":{"acUnarmored":2},"Gantelets de puissance d’ogre":{"setAbility":{"str":19}},"Bandeau d’intellect":{"setAbility":{"int":19}},"Amulette de santé":{"setAbility":{"con":19}},"Bottes de vitesse":{"speed":3}}'::jsonb)->trim(p_name)
$$;

create or replace function public._library_price(p_name text) returns integer language sql immutable as $$
  select price from (values
    ('Potion de soins', 5000),
    ('Potion de soins supérieurs', 25000),
    ('Potion de soins excellents', 250000),
    ('Potion de soins suprêmes', 2500000),
    ('Antidote', 5000),
    ('Potion d’escalade', 7500),
    ('Potion de respiration aquatique', 10000),
    ('Dague', 200),
    ('Bâton', 20),
    ('Masse d’armes', 500),
    ('Lance', 100),
    ('Hachette', 500),
    ('Épée courte', 1000),
    ('Cimeterre', 2500),
    ('Rapière', 2500),
    ('Épée longue', 1500),
    ('Hache d’armes', 1000),
    ('Marteau de guerre', 1500),
    ('Morgenstern', 1500),
    ('Coutille', 2000),
    ('Épée à deux mains', 5000),
    ('Hache à deux mains', 3000),
    ('Arc court', 2500),
    ('Arc long', 5000),
    ('Arbalète légère', 2500),
    ('Arbalète lourde', 5000),
    ('Flèches (20)', 100),
    ('Carreaux (20)', 100),
    ('Armure matelassée', 500),
    ('Armure de cuir', 1000),
    ('Armure de cuir clouté', 4500),
    ('Armure de peau', 1000),
    ('Chemise de mailles', 5000),
    ('Cuirasse', 40000),
    ('Demi-plate', 75000),
    ('Cotte de mailles', 7500),
    ('Harnois', 150000),
    ('Bouclier', 1000),
    ('Sac à dos', 200),
    ('Corde de chanvre (15 m)', 100),
    ('Torche', 1),
    ('Lanterne à capote', 500),
    ('Flasque d’huile', 10),
    ('Rations (1 jour)', 50),
    ('Outre', 20),
    ('Sac de couchage', 100),
    ('Outils de voleur', 2500),
    ('Trousse de soins', 500),
    ('Pied-de-biche', 200),
    ('Grappin', 200),
    ('Focaliseur arcanique', 1000),
    ('Symbole sacré', 500),
    ('Dague +1', 100000),
    ('Épée longue +1', 100000),
    ('Rapière +1', 100000),
    ('Hache d’armes +1', 100000),
    ('Masse d’armes +1', 100000),
    ('Arc long +1', 100000),
    ('Épée longue +2', 400000),
    ('Épée à deux mains +2', 400000),
    ('Armure de cuir +1', 150000),
    ('Chemise de mailles +1', 150000),
    ('Cotte de mailles +1', 150000),
    ('Bouclier +1', 150000),
    ('Bouclier +2', 600000),
    ('Bouclier +3', 2400000),
    ('Armure de cuir clouté +2', 600000),
    ('Demi-plate +1', 200000),
    ('Harnois +1', 650000),
    ('Arc long +2', 400000),
    ('Épée longue +3', 2400000),
    ('Pierre de Ioun (protection)', 400000),
    ('Ceinturon de force de géant des collines', 600000),
    ('Ceinturon de force de géant du givre', 4000000),
    ('Ceinturon de force de géant du feu', 4000000),
    ('Ceinturon de force de géant des nuages', 20000000),
    ('Ceinturon de force de géant des tempêtes', 20000000),
    ('Cape de protection', 350000),
    ('Anneau de protection', 350000),
    ('Pierre porte-bonheur', 420000),
    ('Bracelets de défense', 600000),
    ('Gantelets de puissance d’ogre', 800000),
    ('Bandeau d’intellect', 800000),
    ('Amulette de santé', 800000),
    ('Bottes de vitesse', 400000),
    ('Baguette de projectiles magiques', 50000),
    ('Sac sans fond', 50000),
    ('Bottes elfiques', 250000)
  ) as t(name, price) where lower(t.name) = lower(trim(p_name)) limit 1
$$;

-- ---------- Recalcul de la fiche à partir des objets équipés (= applyGear, src/lib/dnd/gear.ts).
create or replace function public._apply_gear(p_char uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  v_s jsonb; v_prev jsonb; v_base_ac int; v_base_speed numeric; v_ab jsonb := '{}'; v_delta jsonb := '{}'; v_k text; v_v int; v_d int;
  v_it record; v_e jsonb; v_dex int; v_str int; v_armor int; v_shields int := 0; v_bonus int := 0; v_unarmored int := 0;
  v_speed numeric := 0; v_saves int := 0; v_ac int; v_attacks jsonb := '[]'; v_w jsonb; v_wab text;
begin
  select coalesce(sheet, '{}'::jsonb) into v_s from characters where id = p_char for update;
  if not found then return; end if;
  v_prev := coalesce(v_s->'gear', '{}'::jsonb);
  v_base_ac := coalesce((v_s->>'ac')::int, 10) - coalesce((v_prev->>'ac')::int, 0);
  v_base_speed := coalesce((v_s->>'speed')::numeric, 9) - coalesce((v_prev->>'speed')::numeric, 0);
  foreach v_k in array array['str', 'dex', 'con', 'int', 'wis', 'cha'] loop
    v_ab := v_ab || jsonb_build_object(v_k, coalesce((v_s->'abilities'->>v_k)::int, 10) - coalesce((v_prev->'abilities'->>v_k)::int, 0));
  end loop;
  -- Caractéristiques fixées par un objet
  for v_it in select name from items where character_id = p_char and equipped and public._item_effects(name) ? 'setAbility' loop
    for v_k, v_v in select key, value::int from jsonb_each_text(public._item_effects(v_it.name)->'setAbility') loop
      v_d := greatest(0, v_v - (v_ab->>v_k)::int);
      if v_d > coalesce((v_delta->>v_k)::int, 0) then v_delta := v_delta || jsonb_build_object(v_k, v_d); end if;
    end loop;
  end loop;
  for v_k in select jsonb_object_keys(v_delta) loop
    v_ab := v_ab || jsonb_build_object(v_k, (v_ab->>v_k)::int + (v_delta->>v_k)::int);
  end loop;
  v_dex := floor(((v_ab->>'dex')::int - 10) / 2.0)::int;
  v_str := floor(((v_ab->>'str')::int - 10) / 2.0)::int;
  -- CA, vitesse, sauvegardes, armes
  for v_it in select id, name from items where character_id = p_char and equipped and public._item_effects(name) is not null order by created_at, id loop
    v_e := public._item_effects(v_it.name);
    if v_e ? 'armor' then
      v_armor := greatest(coalesce(v_armor, -99), (v_e->'armor'->>'base')::int
        + least(v_dex, coalesce((v_e->'armor'->>'dexMax')::int, 99)));
    end if;
    v_shields := v_shields + coalesce((v_e->>'shield')::int, 0);
    v_bonus := v_bonus + coalesce((v_e->>'ac')::int, 0);
    v_unarmored := v_unarmored + coalesce((v_e->>'acUnarmored')::int, 0);
    v_speed := v_speed + coalesce((v_e->>'speed')::numeric, 0);
    v_saves := v_saves + coalesce((v_e->>'saves')::int, 0);
    if v_e ? 'weapon' then
      v_w := v_e->'weapon';
      v_wab := case when v_w->>'ability' = 'finesse' then case when v_dex > v_str then 'dex' else 'str' end else v_w->>'ability' end;
      v_attacks := v_attacks || jsonb_build_array(jsonb_build_object('id', 'gear-' || v_it.id, 'name', v_it.name, 'ability', v_wab,
        'proficient', true, 'bonus', coalesce((v_w->>'bonus')::int, 0), 'damage', v_w->>'damage', 'addMod', true,
        'damageBonus', coalesce((v_w->>'bonus')::int, 0), 'damageType', v_w->>'type', 'notes', 'Arme équipée', 'range', (v_w->>'range')::numeric));
    end if;
  end loop;
  v_ac := coalesce(v_armor, v_base_ac) + v_shields + v_bonus + case when v_armor is null and v_shields = 0 then v_unarmored else 0 end;
  update characters set sheet = v_s || jsonb_build_object(
      'ac', v_ac, 'speed', v_base_speed + v_speed, 'abilities', coalesce(v_s->'abilities', '{}'::jsonb) || v_ab,
      'attacks', coalesce((select jsonb_agg(a) from jsonb_array_elements(coalesce(v_s->'attacks', '[]'::jsonb)) a
                           where not (a->>'id' like 'gear-%')), '[]'::jsonb) || v_attacks,
      'gear', jsonb_build_object('ac', v_ac - v_base_ac, 'speed', v_speed, 'saves', v_saves, 'abilities', v_delta)),
    updated_at = now()
  where id = p_char;
end $$;

revoke all on function public._apply_gear(uuid) from public, anon, authenticated;

-- Déclencheur : tout changement d'objet (équiper, retirer, donner, vendre, jeter…) recalcule la fiche concernée.
create or replace function public.items_gear() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform public._apply_gear(old.character_id); end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.character_id <> old.character_id) then perform public._apply_gear(new.character_id); end if;
  return null;
end $$;

drop trigger if exists items_gear on public.items;

create trigger items_gear after insert or update or delete on public.items for each row execute function public.items_gear();

-- emplacements des objets portés (une armure, un bouclier, une cape, une paire de bottes… deux anneaux).
--  Mêmes règles que src/lib/dnd/slots.ts (SLOT_PATTERNS recopiés ici).

-- Emplacement d'un objet : armure/bouclier de la bibliothèque d'après leurs effets, sinon d'après le début du nom.
create or replace function public._item_slot(p_name text) returns text language plpgsql immutable as $$
declare v text; e jsonb;
begin
  e := public._item_effects(p_name);
  if e ? 'armor' then return 'armure'; end if;
  if e ? 'shield' then return 'bouclier'; end if;
  if e ? 'weapon' then return null; end if;
  v := translate(lower(trim(coalesce(p_name, ''))), 'àâäáãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  return case
    when v ~ '^(armure|cotte|chemise de mailles|cuirasse|demi-plate|harnois|brigandine|clibanion|broigne)' then 'armure'
    when v ~ '^(bouclier|ecu|pavois|targe|rondache)' then 'bouclier'
    when v ~ '^(chapeau|casque|heaume|bandeau|diademe|couronne|serre-tete|capuche|bonnet|coiffe|tiare|cerclet)' then 'tete'
    when v ~ '^(lunettes|lentilles|yeux)' then 'yeux'
    when v ~ '^(amulette|collier|medaillon|pendentif|periapte|broche|talisman)' then 'cou'
    when v ~ '^(cape|manteau|mante|houppelande)' then 'cape'
    when v ~ '^(ceinture|ceinturon)' then 'ceinture'
    when v ~ '^(gants|gantelets|mitaines)' then 'gants'
    when v ~ '^(bracelets|brassards|bracelet|brassard)' then 'bracelets'
    when v ~ '^(bottes|chaussons|sandales|chausses|souliers|bottines)' then 'bottes'
    when v ~ '^(anneau|bague|chevaliere)' then 'anneau'
    else null end;
end $$;

create or replace function public._slot_label(p_slot text) returns text language sql immutable as $$
  select case p_slot when 'armure' then 'armure' when 'bouclier' then 'bouclier' when 'tete' then 'tête' when 'yeux' then 'yeux'
    when 'cou' then 'cou' when 'cape' then 'cape' when 'ceinture' then 'ceinture' when 'gants' then 'mains' when 'bracelets' then 'poignets'
    when 'bottes' then 'pieds' when 'anneau' then 'anneaux' else p_slot end
$$;

-- une arme à deux mains et un bouclier ne vont pas ensemble.
-- Mêmes règles que src/lib/dnd/slots.ts (TWO_HANDED_PATTERN recopié ici).

create or replace function public._two_handed(p_name text) returns boolean language sql immutable as $$
  select translate(lower(trim(coalesce(p_name, ''))), 'àâäáãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') ~ '^(coutille|hallebarde|pique|maillet|massue|arc court|arc long|arbalete legere|arbalete lourde)|a deux mains'
$$;

create or replace function public._items_slot_check() returns trigger language plpgsql as $$
declare v_slot text; v_names text;
begin
  if not coalesce(new.equipped, false) then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.equipped, false) and old.name = new.name then return new; end if;
  v_slot := public._item_slot(new.name);
  -- v0.23 : arme à deux mains et bouclier ne vont pas ensemble
  select string_agg(name, ', ') into v_names from items where character_id = new.character_id and equipped and id <> new.id
    and ((public._two_handed(new.name) and public._item_slot(name) = 'bouclier') or (v_slot = 'bouclier' and public._two_handed(name)));
  if v_names is not null then raise exception 'Arme à deux mains et bouclier ne vont pas ensemble (%) : retire-le d’abord', v_names; end if;
  if v_slot is null then return new; end if;
  select string_agg(name, ', ') into v_names from (
    select name from items where character_id = new.character_id and equipped and id <> new.id and public._item_slot(name) = v_slot) x;
  if (select count(*) from items where character_id = new.character_id and equipped and id <> new.id and public._item_slot(name) = v_slot)
     >= (case v_slot when 'anneau' then 2 else 1 end) then
    raise exception 'Emplacement % déjà pris (%) : retire-le d’abord', public._slot_label(v_slot), v_names;
  end if;
  return new;
end $$;

drop trigger if exists items_slot on public.items;

create trigger items_slot before insert or update of equipped, name on public.items
  for each row execute function public._items_slot_check();

-- ================================ 07_carte.sql ================================
-- 07 : Carte : position, coût du déplacement, déplacement (et pièges), portes et torches.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- Position d'un combattant sur la grille (anciennes « zones » converties comme posOf côté appli).
create or replace function public._grid_pos(x jsonb) returns int[] language sql immutable as $$
  select case when jsonb_typeof(x->'x') = 'number' and jsonb_typeof(x->'y') = 'number'
    then array[(x->>'x')::int, (x->>'y')::int]
    else array[least(11, (coalesce((x->>'zone')::int, 1) - 1) * 3), 0] end
$$;

-- ---------- Carte : murs (glace, grille), terrain (eau, éboulis), porte verrouillée, objets. Remplace 013/014.
create or replace function public._move_cost(p_combat jsonb, p_mover jsonb, p_tx integer, p_ty integer, p_max integer)
returns integer language plpgsql immutable as $$
declare
  v_cols int := coalesce((p_combat->'map'->>'cols')::int, 12);
  v_rows int := coalesce((p_combat->'map'->>'rows')::int, 16);
  v_cells jsonb := coalesce(p_combat->'map'->'cells', '{}'::jsonb);
  v_n int; v_dist int[]; v_block boolean[]; v_diff boolean[]; v_p int[]; v_k text; v_o jsonb;
  v_cost int; v_i int; v_j int; v_x int; v_y int; v_dx int; v_dy int; v_nx int; v_ny int; v_nc int;
begin
  v_n := v_cols * v_rows;
  v_dist := array_fill(9999, array[v_n]);
  v_block := array_fill(false, array[v_n]);
  v_diff := array_fill(false, array[v_n]);
  for v_k in select jsonb_object_keys(v_cells) loop
    v_x := split_part(v_k, ',', 1)::int; v_y := split_part(v_k, ',', 2)::int;
    continue when v_x < 0 or v_y < 0 or v_x >= v_cols or v_y >= v_rows;
    if v_cells->>v_k in ('wall', 'brick', 'wood', 'ice', 'grate', 'table', 'door', 'door-locked', 'pillar', 'statue', 'chest', 'barrel') then v_block[v_y * v_cols + v_x + 1] := true;
    elsif v_cells->>v_k in ('difficult', 'bush', 'water', 'rubble') then v_diff[v_y * v_cols + v_x + 1] := true; end if;
  end loop;
  for v_o in select x from jsonb_array_elements(coalesce(p_combat->'combatants', '[]'::jsonb)) x loop
    continue when v_o->>'id' = p_mover->>'id' or v_o->>'kind' = p_mover->>'kind' or coalesce(v_o->>'status', '') = 'vaincu';
    v_p := public._grid_pos(v_o);
    if v_p[1] between 0 and v_cols - 1 and v_p[2] between 0 and v_rows - 1 then v_block[v_p[2] * v_cols + v_p[1] + 1] := true; end if;
  end loop;
  v_p := public._grid_pos(p_mover);
  v_dist[v_p[2] * v_cols + v_p[1] + 1] := 0;
  for v_cost in 0..p_max loop
    for v_i in 1..v_n loop
      continue when v_dist[v_i] <> v_cost;
      v_x := (v_i - 1) % v_cols; v_y := (v_i - 1) / v_cols;
      for v_dy in -1..1 loop
        for v_dx in -1..1 loop
          continue when v_dx = 0 and v_dy = 0;
          v_nx := v_x + v_dx; v_ny := v_y + v_dy;
          continue when v_nx < 0 or v_ny < 0 or v_nx >= v_cols or v_ny >= v_rows;
          v_j := v_ny * v_cols + v_nx + 1;
          continue when v_block[v_j];
          v_nc := v_cost + case when v_diff[v_j] then 2 else 1 end;
          if v_nc <= p_max and v_nc < v_dist[v_j] then v_dist[v_j] := v_nc; end if;
        end loop;
      end loop;
    end loop;
  end loop;
  if p_tx < 0 or p_ty < 0 or p_tx >= v_cols or p_ty >= v_rows then return null; end if;
  v_j := p_ty * v_cols + p_tx + 1;
  return case when v_dist[v_j] <= p_max then v_dist[v_j] else null end;
end $$;

-- ---------- Dés côté serveur : « 2d10+3 », « 4d6 », « 1d8-1+2 » (= rollDice, sans les jets spéciaux).
create or replace function public._roll(p_formula text) returns integer language plpgsql volatile as $$
declare v_m text[]; v_total int := 0; v_n int; v_i int; v_sign int;
begin
  for v_m in select regexp_matches(replace(lower(coalesce(p_formula, '0')), ' ', ''), '([+-]?)(\d*)d(\d+)|([+-]?)(\d+)', 'g') loop
    if v_m[3] is not null then
      v_sign := case when v_m[1] = '-' then -1 else 1 end;
      v_n := least(100, coalesce(nullif(v_m[2], '')::int, 1));
      for v_i in 1..v_n loop v_total := v_total + v_sign * (1 + floor(random() * v_m[3]::int)::int); end loop;
    else
      v_total := v_total + case when v_m[4] = '-' then -1 else 1 end * v_m[5]::int;
    end if;
  end loop;
  return greatest(0, v_total);
end $$;

-- ---------- Déplacement : vitesse et PV propres aux compagnons.
create or replace function public._combat_move_core(p_campaign uuid, p_combatant text, p_x integer, p_y integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_gm boolean := public.is_gm(p_campaign);
  v_combat jsonb; v_t jsonb; v_cur text; v_cols int; v_rows int; v_active boolean; v_my_turn boolean;
  v_sheet jsonb; v_speed numeric; v_left numeric; v_used jsonb; v_cost int; v_list jsonb; v_from int[]; v_new jsonb := '[]';
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  if v_combat is null then raise exception 'Pas de carte'; end if;
  select x into v_t from jsonb_array_elements(v_combat->'combatants') x where x->>'id' = p_combatant;
  if v_t is null then raise exception 'Combattant introuvable'; end if;
  v_cols := coalesce((v_combat->'map'->>'cols')::int, 12);
  v_rows := coalesce((v_combat->'map'->>'rows')::int, 16);
  if p_x < 0 or p_y < 0 or p_x >= v_cols or p_y >= v_rows then raise exception 'Hors de la carte'; end if;
  if v_combat->'map'->'cells'->>(p_x || ',' || p_y) in ('wall', 'brick', 'wood', 'ice', 'grate', 'table', 'door', 'door-locked', 'pillar', 'statue', 'chest', 'barrel') then raise exception 'Case infranchissable'; end if;
  if exists (select 1 from jsonb_array_elements(v_combat->'combatants') x
             where x->>'id' <> p_combatant and public._grid_pos(x) = array[p_x, p_y]) then
    raise exception 'Case occupée';
  end if;
  v_active := coalesce((v_combat->>'active')::boolean, false);
  if v_active then
    select t.x->>'id' into v_cur from (
      select x, row_number() over (order by (x->>'initiative')::int desc nulls last, (x->>'initBonus')::int desc,
        case when x->>'kind' = 'pc' then 0 else 1 end, x->>'name') - 1 as rn
      from jsonb_array_elements(v_combat->'combatants') x) t
    where t.rn = coalesce((v_combat->>'turn')::int, 0);
  end if;
  v_my_turn := v_active and v_cur = p_combatant;
  v_used := coalesce(v_t->'used', '{}'::jsonb);
  v_from := public._grid_pos(v_t);

  if not v_gm then
    select sheet into v_sheet from characters where id::text = v_t->>'characterId' and owner_id = auth.uid();
    if not found then raise exception 'Ce n’est pas ton personnage'; end if;
    -- v0.21 : un compagnon a ses propres PV et sa vitesse
    if v_active and v_t ? 'companion' and coalesce((v_t->'companion'->>'hp')::int, 0) <= 0 then
      raise exception 'À terre (0 PV) : impossible de bouger';
    end if;
    if v_active and not v_t ? 'companion' and exists (select 1 from characters where id::text = v_t->>'characterId'
        and coalesce((resources->'pv'->>'max')::int, 0) > 0 and coalesce((resources->'pv'->>'current')::int, 0) <= 0) then
      raise exception 'À terre (0 PV) : impossible de bouger';
    end if;
    if v_active then
      if not v_my_turn then raise exception 'Ce n’est pas ton tour'; end if;
      v_speed := case when v_t ? 'companion' then coalesce((v_t->'companion'->>'speed')::numeric, 9)
        else greatest(0, coalesce((v_sheet->>'speed')::numeric, 9) - 1.5 * coalesce((v_sheet->>'exhaustion')::numeric, 0)) end;
      v_left := greatest(0, v_speed * (1 + coalesce((v_used->>'dash')::int, 0)) - coalesce((v_used->>'moved')::numeric, 0));
      v_cost := public._move_cost(v_combat, v_t, p_x, p_y, floor(v_left / 1.5 + 0.000001)::int);
      if v_cost is null then raise exception 'Trop loin pour ton déplacement restant'; end if;
      v_used := '{"action":0,"bonus":0,"reaction":0,"attacks":0,"moved":0,"dash":0,"disengage":0}'::jsonb || v_used
        || jsonb_build_object('moved', coalesce((v_used->>'moved')::numeric, 0) + v_cost * 1.5);
    end if;
  end if;

  if v_my_turn and coalesce((v_t->'used'->>'disengage')::int, 0) = 0 then
    select coalesce(jsonb_agg(jsonb_build_object('id', gen_random_uuid()::text, 'by', h->>'id', 'target', p_combatant)), '[]'::jsonb)
      into v_new
    from jsonb_array_elements(v_combat->'combatants') h
    where h->>'id' <> p_combatant and h->>'kind' <> v_t->>'kind' and coalesce(h->>'status', '') <> 'vaincu'
      and coalesce((h->'used'->>'reaction')::int, 0) < 1
      and greatest(abs((public._grid_pos(h))[1] - v_from[1]), abs((public._grid_pos(h))[2] - v_from[2])) <= 1
      and greatest(abs((public._grid_pos(h))[1] - p_x), abs((public._grid_pos(h))[2] - p_y)) > 1
      and not exists (select 1 from jsonb_array_elements(coalesce(v_combat->'reactions', '[]'::jsonb)) r
                      where r->>'by' = h->>'id' and r->>'target' = p_combatant);
  end if;

  select jsonb_agg(case when x->>'id' = p_combatant
      then x - 'zone' || jsonb_build_object('x', p_x, 'y', p_y)
        || case when not v_gm and v_active then jsonb_build_object('used', v_used) else '{}'::jsonb end
      else x end)
    into v_list from jsonb_array_elements(v_combat->'combatants') x;
  update campaigns set combat = v_combat || jsonb_build_object('combatants', v_list,
    'reactions', coalesce(v_combat->'reactions', '[]'::jsonb) || v_new) where id = p_campaign;
end $$;

revoke all on function public._combat_move_core(uuid, text, integer, integer) from public, anon, authenticated;

revoke all on function public._combat_move_core(uuid, text, integer, integer) from public, anon, authenticated;

-- ---------- Déplacement + pièges : un compagnon touché perd ses propres PV.
create or replace function public.combat_move(p_campaign uuid, p_combatant text, p_x integer, p_y integer)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_gm boolean := public.is_gm(p_campaign);
  v_combat jsonb; v_armed boolean; v_k text := p_x || ',' || p_y; v_t jsonb; v_secrets jsonb; v_trap jsonb; v_sec jsonb;
  v_sheet jsonb; v_char uuid; v_ab text; v_bonus int := 0; v_lvl int; v_roll int; v_saved boolean; v_dmg int; v_amount int;
  v_hp int; v_max int; v_status text; v_list jsonb;
begin
  select combat into v_combat from campaigns where id = p_campaign;
  v_armed := coalesce((v_combat->>'active')::boolean, false) or not v_gm;
  perform public._combat_move_core(p_campaign, p_combatant, p_x, p_y);
  select combat into v_combat from campaigns where id = p_campaign for update;
  if not v_armed or v_combat->'map'->'cells'->>v_k is distinct from 'trap' then return null; end if;

  select x into v_t from jsonb_array_elements(v_combat->'combatants') x where x->>'id' = p_combatant;
  select data into v_secrets from campaign_secrets where campaign_id = p_campaign for update;
  v_secrets := coalesce(v_secrets, '{"monsters":{}}'::jsonb);
  v_trap := '{"name":"Piège","dc":13,"ability":"dex","damage":"2d10","half":true}'::jsonb || coalesce(v_secrets->'traps'->v_k, '{}'::jsonb);
  v_ab := v_trap->>'ability';
  if v_t->>'kind' = 'monster' then
    v_sec := v_secrets->'monsters'->(v_t->>'id');
    v_bonus := coalesce((v_sec->'saves'->>v_ab)::int, 0);
  elsif v_t ? 'companion' then
    v_bonus := coalesce((v_t->'companion'->'saves'->>v_ab)::int, 0);
  else
    select id, sheet into v_char, v_sheet from characters where id::text = v_t->>'characterId';
    if v_sheet is not null then
      v_lvl := least(20, greatest(1, coalesce((v_sheet->>'level')::int, 1)));
      v_bonus := floor((coalesce((v_sheet->'abilities'->>v_ab)::int, 10) - 10) / 2.0)::int
        + case when coalesce(v_sheet->'saveProf', '[]'::jsonb) ? v_ab then 2 + (v_lvl - 1) / 4 else 0 end
        + coalesce((v_sheet->'gear'->>'saves')::int, 0);
    end if;
  end if;
  v_roll := 1 + floor(random() * 20)::int + v_bonus;
  v_saved := v_roll >= (v_trap->>'dc')::int;
  v_dmg := public._roll(v_trap->>'damage');
  v_amount := case when v_saved then case when (v_trap->>'half')::boolean then v_dmg / 2 else 0 end else v_dmg end;

  if v_sec is not null and v_amount > 0 then
    v_hp := greatest(0, (v_sec->>'hp')::int - v_amount); v_max := coalesce((v_sec->>'maxHp')::int, 0);
    v_secrets := jsonb_set(v_secrets, array['monsters', v_t->>'id', 'hp'], to_jsonb(v_hp));
    v_status := case when v_hp <= 0 then 'vaincu' when v_max > 0 and v_hp <= v_max / 2.0 then 'en sang' when v_hp < v_max then 'blessé' else 'indemne' end;
    insert into campaign_secrets (campaign_id, data) values (p_campaign, v_secrets)
      on conflict (campaign_id) do update set data = excluded.data, updated_at = now();
  elsif v_char is not null and v_amount > 0 then
    perform public._apply_hp_internal(v_char, -v_amount);
  end if;
  -- v0.21 : compagnon touché par le piège (ses propres PV, sur son pion)
  if v_t ? 'companion' and v_amount > 0 then
    select jsonb_agg(case when x->>'id' = p_combatant then jsonb_set(x, '{companion,hp}', to_jsonb(greatest(0, (x->'companion'->>'hp')::int - v_amount))) else x end)
      into v_list from jsonb_array_elements(v_combat->'combatants') x;
    v_combat := v_combat || jsonb_build_object('combatants', v_list);
  end if;
  select jsonb_agg(case when x->>'id' = p_combatant and v_status is not null then x || jsonb_build_object('status', v_status) else x end)
    into v_list from jsonb_array_elements(v_combat->'combatants') x;
  update campaigns set combat = jsonb_set(v_combat || jsonb_build_object('combatants', v_list), array['map', 'cells', v_k], '"trap-sprung"')
    where id = p_campaign;
  return '🪤 ' || (v_trap->>'name') || ' ! ' || (v_t->>'name') || ' : sauvegarde '
    || case v_ab when 'str' then 'FOR' when 'dex' then 'DEX' when 'con' then 'CON' when 'int' then 'INT' when 'wis' then 'SAG' else 'CHA' end
    || ' ' || v_roll || ' contre DD ' || (v_trap->>'dc') || ', ' || case when v_saved then 'réussie' else 'ratée' end
    || ' · ' || v_amount || ' dégât' || case when v_amount > 1 then 's' else '' end;
end $$;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

grant execute on function public.combat_move(uuid, text, integer, integer) to authenticated;

-- torches de la carte allumées / éteintes (touchées au contact, comme une porte).
-- Mêmes règles que src/lib/dnd/movement.ts (toggleDoor). Les sorts de lumière (effet « light ») passent par combat_act sans changement.

create or replace function public.toggle_door(p_campaign uuid, p_x integer, p_y integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_combat jsonb; v_k text := p_x || ',' || p_y; v_cur text; v_turn text; v_ok boolean; v_torch boolean;
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  v_cur := v_combat->'map'->'cells'->>v_k;
  v_torch := v_cur in ('torch', 'torch-off');
  if v_cur is null or (v_cur not in ('door', 'door-open', 'door-locked') and not v_torch) then raise exception 'Pas de porte ici'; end if;
  if v_cur = 'door-locked' and not public.is_gm(p_campaign) then raise exception '🔒 Verrouillée : seul le MJ peut l’ouvrir'; end if;
  if not public.is_gm(p_campaign) then
    if coalesce((v_combat->>'active')::boolean, false) then
      select t.x->>'id' into v_turn from (
        select x, row_number() over (order by (x->>'initiative')::int desc nulls last, (x->>'initBonus')::int desc,
          case when x->>'kind' = 'pc' then 0 else 1 end, x->>'name') - 1 as rn
        from jsonb_array_elements(v_combat->'combatants') x) t
      where t.rn = coalesce((v_combat->>'turn')::int, 0);
    end if;
    select exists (
      select 1 from jsonb_array_elements(v_combat->'combatants') x
      join characters ch on ch.id::text = x->>'characterId' and ch.owner_id = auth.uid()
      where greatest(abs((public._grid_pos(x))[1] - p_x), abs((public._grid_pos(x))[2] - p_y)) <= 1
        and (v_turn is null or x->>'id' = v_turn)) into v_ok;
    if not v_ok then raise exception 'Approche-toi % (ou attends ton tour)', case when v_torch then 'de la torche' else 'de la porte' end; end if;
  end if;
  if v_torch then
    update campaigns set combat = jsonb_set(v_combat, array['map', 'cells', v_k], to_jsonb(case when v_cur = 'torch' then 'torch-off' else 'torch' end)) where id = p_campaign;
    return;
  end if;
  if v_cur = 'door-open' and exists (select 1 from jsonb_array_elements(v_combat->'combatants') x where public._grid_pos(x) = array[p_x, p_y]) then
    raise exception 'Quelqu’un bloque la porte';
  end if;
  update campaigns set combat = jsonb_set(v_combat, array['map', 'cells', v_k],
    to_jsonb(case when v_cur = 'door-open' then 'door' when v_cur = 'door-locked' then 'door' else 'door-open' end)) where id = p_campaign;
end $$;

grant execute on function public.toggle_door(uuid, integer, integer) to authenticated;

grant execute on function public.toggle_door(uuid, integer, integer) to authenticated;

grant execute on function public.toggle_door(uuid, integer, integer) to authenticated;

-- ================================ 08_tours_compagnons.sql ================================
-- 08 : Tours de combat : initiative, retrait, fin de tour ; compagnons et invocations.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- Initiative : le MJ pour tous, un joueur seulement pour son propre personnage.
create or replace function public.set_initiative(p_campaign uuid, p_combatant text, p_value integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_combat jsonb; v_target jsonb; v_list jsonb;
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  select x into v_target from jsonb_array_elements(coalesce(v_combat->'combatants', '[]'::jsonb)) x where x->>'id' = p_combatant;
  if v_target is null then raise exception 'Combattant introuvable'; end if;
  if not public.is_gm(p_campaign) and not exists (
    select 1 from characters where id::text = v_target->>'characterId' and owner_id = auth.uid()
  ) then raise exception 'Ce n’est pas ton personnage'; end if;
  select coalesce(jsonb_agg(case when x->>'id' = p_combatant then x || jsonb_build_object('initiative', p_value) else x end), '[]'::jsonb)
    into v_list from jsonb_array_elements(v_combat->'combatants') x;
  update campaigns set combat = v_combat || jsonb_build_object('combatants', v_list) where id = p_campaign;
end $$;

grant execute on function public.set_initiative(uuid, text, integer) to authenticated;

-- Ignorer une attaque d'opportunité : MJ, ou propriétaire du perso qui pouvait attaquer.
create or replace function public.combat_dismiss(p_campaign uuid, p_reaction text)
returns void language plpgsql security definer set search_path = public as $$
declare v_combat jsonb; v_r jsonb; v_by jsonb;
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  select r into v_r from jsonb_array_elements(coalesce(v_combat->'reactions', '[]'::jsonb)) r where r->>'id' = p_reaction;
  if v_r is null then return; end if;
  select x into v_by from jsonb_array_elements(v_combat->'combatants') x where x->>'id' = v_r->>'by';
  if not public.is_gm(p_campaign) and not exists (
      select 1 from characters where id::text = v_by->>'characterId' and owner_id = auth.uid()) then
    raise exception 'Ce n’est pas ta réaction';
  end if;
  update campaigns set combat = v_combat || jsonb_build_object('reactions',
    coalesce((select jsonb_agg(r) from jsonb_array_elements(v_combat->'reactions') r where r->>'id' <> p_reaction), '[]'::jsonb))
  where id = p_campaign;
end $$;

grant execute on function public.combat_dismiss(uuid, text) to authenticated;

-- Finir le tour : le MJ pour tout le monde, un joueur seulement pendant le tour de son perso.
-- Même calcul que nextTurn (src/lib/dnd/combat.ts) : on saute les monstres vaincus, le suivant récupère ses actions.
create or replace function public.end_turn(p_campaign uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_combat jsonb; v_order jsonb; v_n int; v_turn int; v_round int; v_cur jsonb; v_next jsonb; v_i int; v_list jsonb;
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  if not coalesce((v_combat->>'active')::boolean, false) then raise exception 'Le combat n’a pas commencé'; end if;
  select coalesce(jsonb_agg(x order by (x->>'initiative')::int desc nulls last, (x->>'initBonus')::int desc,
           case when x->>'kind' = 'pc' then 0 else 1 end, x->>'name'), '[]'::jsonb)
    into v_order from jsonb_array_elements(v_combat->'combatants') x;
  v_n := jsonb_array_length(v_order);
  if v_n = 0 then return; end if;
  v_turn := coalesce((v_combat->>'turn')::int, 0);
  v_round := coalesce((v_combat->>'round')::int, 1);
  v_cur := v_order->v_turn;
  if not public.is_gm(p_campaign) and not exists (
      select 1 from characters where id::text = v_cur->>'characterId' and owner_id = auth.uid()) then
    raise exception 'Ce n’est pas ton tour';
  end if;
  for v_i in 1..v_n loop
    v_turn := v_turn + 1;
    if v_turn >= v_n then v_turn := 0; v_round := v_round + 1; end if;
    exit when not (v_order->v_turn->>'kind' = 'monster' and coalesce(v_order->v_turn->>'status', '') = 'vaincu');
  end loop;
  v_next := v_order->v_turn;
  select jsonb_agg(case when x->>'id' = v_next->>'id'
      then x || '{"used":{"action":0,"bonus":0,"reaction":0,"attacks":0,"moved":0,"dash":0,"disengage":0}}'::jsonb else x end)
    into v_list from jsonb_array_elements(v_combat->'combatants') x;
  update campaigns set combat = v_combat || jsonb_build_object('turn', v_turn, 'round', v_round, 'combatants', v_list, 'reactions', '[]'::jsonb)
    where id = p_campaign;
end $$;

grant execute on function public.end_turn(uuid) to authenticated;

-- compagnons et invocations sur la carte (venir, bouger, être blessés, repartir), Mage de guerre en combat.
--  Mêmes règles que src/lib/dnd/companions.ts et resolve.ts.

-- ---------- Compagnons (= companions.ts) : PV sur le pion, venir près du maître, repartir.
create or replace function public._set_companion_hp(p_combat jsonb, p_id text, p_hp integer) returns jsonb language sql immutable as $$
  select p_combat || jsonb_build_object('combatants', (select jsonb_agg(case when x->>'id' = p_id and x ? 'companion'
      then (jsonb_set(x, '{companion,hp}', to_jsonb(greatest(0, least(p_hp, coalesce((x->'companion'->>'maxHp')::int, p_hp))))) - 'status')
        || case when p_hp <= 0 then '{"status":"vaincu"}'::jsonb else '{}'::jsonb end
      else x end) from jsonb_array_elements(p_combat->'combatants') x))
$$;

create or replace function public.summon_companion(p_campaign uuid, p_char uuid, p_companion text)
returns void language plpgsql security definer set search_path = public as $$
declare v_combat jsonb; v_ch characters; v_def jsonb; v_owner jsonb; v_x int := 1; v_y int := 1; v_cols int; v_rows int;
  v_r int; v_dx int; v_dy int; v_found boolean := false; v_px int; v_py int;
begin
  select * into v_ch from characters where id = p_char and campaign_id = p_campaign;
  if not found then raise exception 'Personnage introuvable'; end if;
  if not public.is_gm(p_campaign) and v_ch.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton personnage'; end if;
  select d into v_def from jsonb_array_elements(coalesce(v_ch.sheet->'companions', '[]'::jsonb)) d where d->>'id' = p_companion;
  if v_def is null then raise exception 'Compagnon introuvable'; end if;
  select combat into v_combat from campaigns where id = p_campaign for update;
  v_combat := coalesce(v_combat, '{"active":false,"round":0,"turn":0,"combatants":[]}'::jsonb);
  if exists (select 1 from jsonb_array_elements(coalesce(v_combat->'combatants', '[]'::jsonb)) x where x->>'characterId' = p_char::text and x->>'companionOf' = p_companion) then
    raise exception '% est déjà sur la carte', v_def->>'name';
  end if;
  select x into v_owner from jsonb_array_elements(coalesce(v_combat->'combatants', '[]'::jsonb)) x where x->>'characterId' = p_char::text and not x ? 'companion' limit 1;
  if v_owner is not null then v_x := (public._grid_pos(v_owner))[1]; v_y := (public._grid_pos(v_owner))[2]; end if;
  v_cols := coalesce((v_combat->'map'->>'cols')::int, 12); v_rows := coalesce((v_combat->'map'->>'rows')::int, 16);
  -- Case libre la plus proche (ni mur ni pion), en tournant autour du maître (= nearestFree)
  <<search>>
  for v_r in 1..greatest(v_cols, v_rows) loop
    for v_dy in -v_r..v_r loop
      for v_dx in -v_r..v_r loop
        continue when greatest(abs(v_dx), abs(v_dy)) <> v_r;
        v_px := v_x + v_dx; v_py := v_y + v_dy;
        continue when v_px < 0 or v_py < 0 or v_px >= v_cols or v_py >= v_rows;
        continue when coalesce(v_combat->'map'->'cells'->>(v_px || ',' || v_py), '') in ('wall', 'brick', 'wood', 'ice', 'grate', 'table', 'door', 'door-locked', 'pillar', 'statue', 'chest', 'barrel');
        continue when exists (select 1 from jsonb_array_elements(coalesce(v_combat->'combatants', '[]'::jsonb)) o where public._grid_pos(o) = array[v_px, v_py]);
        v_found := true; exit search;
      end loop;
    end loop;
  end loop;
  if not v_found then v_px := v_x; v_py := v_y; end if;
  update campaigns set combat = v_combat || jsonb_build_object('combatants', coalesce(v_combat->'combatants', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text, 'name', v_def->>'name', 'avatar', coalesce(v_def->>'avatar', '🐾'), 'kind', 'pc', 'characterId', p_char::text,
      'companionOf', p_companion, 'initiative', v_owner->'initiative', 'initBonus', coalesce((v_owner->>'initBonus')::int, 0) - 1, 'conditions', '[]'::jsonb,
      'x', v_px, 'y', v_py,
      'companion', (v_def - 'id' - 'name' - 'avatar') || jsonb_build_object('hp', coalesce((v_def->>'maxHp')::int, 1)))))
  where id = p_campaign;
end $$;

grant execute on function public.summon_companion(uuid, uuid, text) to authenticated;

create or replace function public.dismiss_companion(p_campaign uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
declare v_combat jsonb; v_t jsonb;
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  select x into v_t from jsonb_array_elements(coalesce(v_combat->'combatants', '[]'::jsonb)) x where x->>'id' = p_token and x ? 'companion';
  if v_t is null then raise exception 'Compagnon introuvable'; end if;
  if not public.is_gm(p_campaign) and not exists (select 1 from characters where id::text = v_t->>'characterId' and owner_id = auth.uid()) then
    raise exception 'Ce n’est pas ton compagnon';
  end if;
  update campaigns set combat = v_combat || jsonb_build_object('combatants',
    coalesce((select jsonb_agg(x) from jsonb_array_elements(v_combat->'combatants') x where x->>'id' <> p_token), '[]'::jsonb))
  where id = p_campaign;
end $$;

grant execute on function public.dismiss_companion(uuid, text) to authenticated;

-- ================================ 09_combat.sql ================================
-- 09 : Actions de combat : effets à durée, dégâts (résistances), concentration, résolution complète (combat_act).
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- effets temporaires (Bénédiction, Bouclier, Rage…), types de dégâts (résistance, immunité, vulnérabilité) et
-- sauvegarde de concentration automatique dans les actions de combat.
-- Mêmes calculs que src/lib/dnd/effects.ts, damage.ts et resolve.ts.

-- Dé signé : « 1d4 » ou « -1d4 ».
create or replace function public._roll_signed(p_dice text) returns integer language sql volatile as $$
  select case when p_dice is null or p_dice = '' then 0
              when left(p_dice, 1) = '-' then -public._roll(substr(p_dice, 2)) else public._roll(p_dice) end
$$;

-- Effets encore actifs d'un combattant au round donné.
create or replace function public._effects_active(p_c jsonb, p_round integer) returns setof jsonb language sql stable as $$
  select e from jsonb_array_elements(coalesce(p_c->'effects', '[]'::jsonb)) e where coalesce((e->>'until')::int, 0) >= p_round
$$;

create or replace function public._effects_ac(p_c jsonb, p_round integer) returns integer language sql stable as $$
  select coalesce(sum(coalesce((e->>'ac')::int, 0)), 0)::int from public._effects_active(p_c, p_round) e
$$;

create or replace function public._effects_saves(p_c jsonb, p_round integer) returns integer language sql volatile as $$
  select coalesce(sum(public._roll_signed(e->>'saves')), 0)::int from public._effects_active(p_c, p_round) e where coalesce(e->>'saves', '') <> ''
$$;

create or replace function public._effects_resist(p_c jsonb, p_round integer) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(r), '[]'::jsonb) from public._effects_active(p_c, p_round) e, jsonb_array_elements(coalesce(e->'resist', '[]'::jsonb)) r
$$;

-- Fin de concentration d'un lanceur : ses effets de concentration disparaissent (= dropConcentration).
create or replace function public._drop_conc(p_combat jsonb, p_source text) returns jsonb language sql stable as $$
  select p_combat || jsonb_build_object('combatants', coalesce((select jsonb_agg(
      case when x ? 'effects' then x || jsonb_build_object('effects', coalesce((select jsonb_agg(e) from jsonb_array_elements(x->'effects') e
             where not (coalesce((e->>'conc')::boolean, false) and e->>'source' = p_source)), '[]'::jsonb)) else x end)
    from jsonb_array_elements(coalesce(p_combat->'combatants', '[]'::jsonb)) x), '[]'::jsonb))
$$;

-- Dégâts après défenses (= adjustDamage) : immunité 0, résistance moitié, vulnérabilité ×2 (les deux s'annulent).
create or replace function public._adjust_damage(p_amount integer, p_type text, p_def jsonb, p_extra_resist jsonb,
  out amount integer, out note text) language plpgsql immutable as $$
declare v_r boolean; v_v boolean;
begin
  amount := p_amount; note := null;
  if p_type is null or p_type = '' or p_amount <= 0 then return; end if;
  if coalesce(p_def->'immune', '[]'::jsonb) ? p_type then amount := 0; note := 'immunisé'; return; end if;
  v_r := coalesce(p_def->'resist', '[]'::jsonb) ? p_type or coalesce(p_extra_resist, '[]'::jsonb) ? p_type;
  v_v := coalesce(p_def->'vuln', '[]'::jsonb) ? p_type;
  if v_r and not v_v then amount := p_amount / 2; note := 'résistant';
  elsif v_v and not v_r then amount := p_amount * 2; note := 'vulnérable'; end if;
end $$;

-- Bonus de sauvegarde d'un perso (= saveBonus : mod + maîtrise + objets).
create or replace function public._save_bonus(p_sheet jsonb, p_ab text) returns integer language sql immutable as $$
  select floor((coalesce((p_sheet->'abilities'->>p_ab)::int, 10) - 10) / 2.0)::int
    + case when coalesce(p_sheet->'saveProf', '[]'::jsonb) ? p_ab then 2 + (least(20, greatest(1, coalesce((p_sheet->>'level')::int, 1))) - 1) / 4 else 0 end
    + coalesce((p_sheet->'gear'->>'saves')::int, 0)
$$;

-- actions de combat contre et par les compagnons (CA, sauvegardes, PV propres) ; Mage de guerre (avantage en concentration).
--  Mêmes règles que src/lib/dnd/resolve.ts.

-- ---------- Actions de combat : compagnons (CA, sauvegardes, PV propres) et Mage de guerre.
create or replace function public.combat_act(p_campaign uuid, p_actor text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gm boolean := public.is_gm(p_campaign);
  v_combat jsonb; v_actor jsonb; v_cur text; v_used jsonb; v_cost text; v_apa int;
  v_secrets jsonb; v_results jsonb := '[]'; v_statuses jsonb := '{}'; v_list jsonb;
  v_tid text; v_t jsonb; v_sec jsonb; v_sheet jsonb; v_char uuid; v_kind text := p_payload->>'kind';
  v_hit boolean; v_saved boolean; v_roll int; v_amount int; v_ac int; v_bonus int; v_ab text; v_lvl int; v_hp int; v_max int;
  v_dmg int := coalesce((p_payload->>'damage')::int, 0); v_nat int := (p_payload->>'natural')::int;
  v_round int; v_eff jsonb; v_adj record; v_dc int; v_croll int; v_kept boolean; v_conc jsonb; v_now int;
begin
  select combat into v_combat from campaigns where id = p_campaign for update;
  if not coalesce((v_combat->>'active')::boolean, false) then raise exception 'Le combat n’a pas commencé'; end if;
  select x into v_actor from jsonb_array_elements(v_combat->'combatants') x where x->>'id' = p_actor;
  if v_actor is null then raise exception 'Combattant introuvable'; end if;
  if not v_gm and not exists (select 1 from characters where id::text = v_actor->>'characterId' and owner_id = auth.uid()) then
    raise exception 'Ce n’est pas ton personnage';
  end if;
  -- v0.11 : un perso à 0 PV ne peut plus agir (v0.21 : un compagnon, d'après ses propres PV)
  if (v_actor ? 'companion' and coalesce((v_actor->'companion'->>'hp')::int, 0) <= 0) or (not v_actor ? 'companion' and exists (select 1 from characters where id::text = v_actor->>'characterId'
             and coalesce((resources->'pv'->>'max')::int, 0) > 0 and coalesce((resources->'pv'->>'current')::int, 0) <= 0)) then
    raise exception 'À terre (0 PV) : plus d’action possible';
  end if;

  -- Combattant actif (même tri que sortedCombatants)
  select t.x->>'id' into v_cur from (
    select x, row_number() over (order by (x->>'initiative')::int desc nulls last, (x->>'initBonus')::int desc,
      case when x->>'kind' = 'pc' then 0 else 1 end, x->>'name') - 1 as rn
    from jsonb_array_elements(v_combat->'combatants') x) t
  where t.rn = coalesce((v_combat->>'turn')::int, 0);

  -- Économie d'actions
  v_cost := coalesce(p_payload->>'economy', 'action');
  v_apa := greatest(1, coalesce((p_payload->>'attacksPerAction')::int, 1));
  if not v_gm and v_cur is distinct from p_actor and v_cost not in ('reaction', 'free') then raise exception 'Ce n’est pas ton tour'; end if;
  v_used := coalesce(v_actor->'used', '{"action":0,"bonus":0,"reaction":0,"attacks":0,"moved":0,"dash":0,"disengage":0}'::jsonb);
  if v_cost = 'attack' then
    if coalesce((v_used->>'attacks')::int, 0) > 0 then
      if (v_used->>'attacks')::int >= v_apa then raise exception 'Plus d’attaque disponible ce tour'; end if;
      v_used := v_used || jsonb_build_object('attacks', (v_used->>'attacks')::int + 1);
    else
      if coalesce((v_used->>'action')::int, 0) >= 1 then raise exception 'Action déjà utilisée ce tour'; end if;
      v_used := v_used || '{"action":1,"attacks":1}'::jsonb;
    end if;
  elsif v_cost in ('action', 'bonus', 'reaction') then
    if coalesce((v_used->>v_cost)::int, 0) >= 1 then raise exception 'Déjà utilisée ce tour : %', v_cost; end if;
    v_used := v_used || jsonb_build_object(v_cost, coalesce((v_used->>v_cost)::int, 0) + 1);
  end if;
  if coalesce((p_payload->>'extraAction')::boolean, false) then v_used := v_used || '{"action":0,"attacks":0}'::jsonb; end if;
  -- v0.6 : « Foncer » double le déplacement du tour
  if coalesce((p_payload->>'dash')::boolean, false) then v_used := v_used || '{"dash":1}'::jsonb; end if;
  -- v0.7 : « Se désengager » (pas d'attaque d'opportunité ce tour)
  if coalesce((p_payload->>'disengage')::boolean, false) then v_used := v_used || '{"disengage":1}'::jsonb; end if;
  -- v0.12 : Esquiver (désavantage contre lui jusqu'à son prochain tour)
  if coalesce((p_payload->>'dodge')::boolean, false) then v_used := v_used || '{"dodge":1}'::jsonb; end if;

  select data into v_secrets from campaign_secrets where campaign_id = p_campaign for update;
  v_secrets := coalesce(v_secrets, '{"monsters":{}}'::jsonb);
  v_round := greatest(1, coalesce((v_combat->>'round')::int, 1));

  -- v0.19 : effet posé (Bénédiction, Bouclier, Rage…) = addEffect (src/lib/dnd/effects.ts)
  if v_kind = 'buff' then
    v_eff := p_payload->'effect';
    if v_eff is null or coalesce(trim(v_eff->>'name'), '') = '' or coalesce((v_eff->>'rounds')::int, 0) not between 1 and 100
       or abs(coalesce((v_eff->>'ac')::int, 0)) > 5
       or coalesce(v_eff->>'attack', 'd4') !~ '^-?\d?d(4|6|8|10|12)$' or coalesce(v_eff->>'saves', 'd4') !~ '^-?\d?d(4|6|8|10|12)$' then
      raise exception 'Effet invalide';
    end if;
    if coalesce((v_eff->>'conc')::boolean, false) then v_combat := public._drop_conc(v_combat, p_actor); end if;
    v_eff := (v_eff - 'rounds') || jsonb_build_object('id', gen_random_uuid()::text, 'until', v_round + (v_eff->>'rounds')::int - 1, 'source', p_actor);
    select jsonb_agg(case when coalesce(p_payload->'targets', '[]'::jsonb) ? (x->>'id')
        then x || jsonb_build_object('effects', coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(x->'effects', '[]'::jsonb)) e
                                                          where (e->>'until')::int >= v_round and e->>'name' <> v_eff->>'name'), '[]'::jsonb) || jsonb_build_array(v_eff))
        else x end)
      into v_list from jsonb_array_elements(v_combat->'combatants') x;
    v_combat := v_combat || jsonb_build_object('combatants', v_list);
    select coalesce(jsonb_agg(jsonb_build_object('target', x->>'id', 'name', x->>'name', 'amount', 0, 'kind', 'buff',
             'effect', coalesce(v_eff->>'icon', '') || ' ' || (v_eff->>'name'))), '[]'::jsonb)
      into v_results from jsonb_array_elements(v_combat->'combatants') x where coalesce(p_payload->'targets', '[]'::jsonb) ? (x->>'id');
  end if;

  for v_tid in select jsonb_array_elements_text(coalesce(p_payload->'targets', '[]'::jsonb)) loop
    exit when v_kind = 'buff';
    select x into v_t from jsonb_array_elements(v_combat->'combatants') x where x->>'id' = v_tid;
    continue when v_t is null;
    v_sec := null; v_sheet := null; v_char := null; v_hit := null; v_saved := null; v_roll := null; v_amount := 0;
    if v_t->>'kind' = 'monster' then v_sec := v_secrets->'monsters'->v_tid;
    elsif v_t ? 'companion' then v_sec := (v_t->'companion') || '{"companion":true}'::jsonb; -- v0.21 : compagnon = ses statistiques
    else select id, sheet into v_char, v_sheet from characters where id::text = v_t->>'characterId'; end if;

    if v_kind = 'attack' then
      v_ac := coalesce((v_sec->>'ac')::int, (v_sheet->>'ac')::int, 10) + public._effects_ac(v_t, v_round);
      v_hit := v_nat = 20 or (coalesce(v_nat, 0) <> 1 and coalesce((p_payload->>'total')::int, 0) >= v_ac);
      if v_hit then v_amount := v_dmg; end if;
    elsif v_kind = 'save' then
      v_ab := coalesce(p_payload->>'ability', 'dex');
      if v_sec is not null then v_bonus := coalesce((v_sec->'saves'->>v_ab)::int, 0);
      elsif v_sheet is not null then
        v_lvl := least(20, greatest(1, coalesce((v_sheet->>'level')::int, 1)));
        v_bonus := floor((coalesce((v_sheet->'abilities'->>v_ab)::int, 10) - 10) / 2.0)::int
          + case when coalesce(v_sheet->'saveProf', '[]'::jsonb) ? v_ab then 2 + (v_lvl - 1) / 4 else 0 end
          + coalesce((v_sheet->'gear'->>'saves')::int, 0); -- v0.15 : bonus des objets équipés
      else v_bonus := 0; end if;
      v_roll := 1 + floor(random() * 20)::int + v_bonus + public._effects_saves(v_t, v_round);
      v_saved := v_roll >= coalesce((p_payload->>'dc')::int, 10);
      v_amount := case when v_saved then case when coalesce((p_payload->>'half')::boolean, false) then v_dmg / 2 else 0 end else v_dmg end;
    elsif v_kind = 'auto' then v_amount := v_dmg;
    end if;

    if v_kind = 'heal' then
      v_amount := greatest(0, coalesce((p_payload->>'heal')::int, 0));
      if v_sec is not null then
        v_max := coalesce((v_sec->>'maxHp')::int, 0);
        v_hp := (v_sec->>'hp')::int + v_amount;
        if v_max > 0 then v_hp := least(v_max, v_hp); end if;
        if v_sec ? 'companion' then v_combat := public._set_companion_hp(v_combat, v_tid, v_hp);
        else v_secrets := jsonb_set(v_secrets, array['monsters', v_tid, 'hp'], to_jsonb(v_hp)); end if;
      elsif v_char is not null then perform public._apply_hp_internal(v_char, v_amount); end if;
      v_results := v_results || jsonb_build_array(jsonb_build_object('target', v_tid, 'name', v_t->>'name', 'amount', v_amount, 'kind', 'heal'));
    else
      -- v0.19 : résistances / immunités / vulnérabilités (défenses + effets) = adjustDamage
      select * into v_adj from public._adjust_damage(v_amount, p_payload->>'damageType',
        coalesce(v_sec->'defenses', v_sheet->'defenses', '{}'::jsonb), public._effects_resist(v_t, v_round));
      v_amount := v_adj.amount;
      v_conc := null;
      if v_amount > 0 then
        if v_sec ? 'companion' then
          v_combat := public._set_companion_hp(v_combat, v_tid, greatest(0, (v_sec->>'hp')::int - v_amount));
        elsif v_sec is not null then
          v_secrets := jsonb_set(v_secrets, array['monsters', v_tid, 'hp'], to_jsonb(greatest(0, (v_sec->>'hp')::int - v_amount)));
        elsif v_char is not null then
          perform public._apply_hp_internal(v_char, -v_amount);
          -- Concentration : à 0 PV elle s'arrête ; sinon sauvegarde de CON (DD 10 ou moitié des dégâts, 30 max)
          if coalesce(v_sheet->>'concentration', '') <> '' then
            v_dc := least(30, greatest(10, v_amount / 2));
            select coalesce((resources->'pv'->>'current')::int, 0) into v_now from characters where id = v_char;
            v_croll := case when v_now > 0 then greatest(1 + floor(random() * 20)::int,
                case when public._has_conc_adv(v_sheet) then 1 + floor(random() * 20)::int else 0 end) -- Mage de guerre : avantage
              + public._save_bonus(v_sheet, 'con') + public._effects_saves(v_t, v_round) end;
            v_kept := v_croll is not null and v_croll >= v_dc;
            v_conc := jsonb_strip_nulls(jsonb_build_object('dc', v_dc, 'roll', v_croll, 'kept', v_kept));
            if not v_kept then
              update characters set sheet = sheet || '{"concentration":""}'::jsonb, updated_at = now() where id = v_char;
              v_combat := public._drop_conc(v_combat, v_tid);
            end if;
          end if;
        end if;
      end if;
      v_results := v_results || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('target', v_tid, 'name', v_t->>'name',
        'hit', v_hit, 'saved', v_saved, 'roll', v_roll, 'amount', v_amount, 'kind', case when v_amount > 0 then 'damage' else 'none' end,
        'note', v_adj.note, 'conc', v_conc)));
    end if;

    if v_sec is not null and not v_sec ? 'companion' then
      v_hp := (v_secrets->'monsters'->v_tid->>'hp')::int; v_max := coalesce((v_sec->>'maxHp')::int, 0);
      v_statuses := v_statuses || jsonb_build_object(v_tid, case when v_hp <= 0 then 'vaincu'
        when v_max > 0 and v_hp <= v_max / 2.0 then 'en sang' when v_hp < v_max then 'blessé' else 'indemne' end);
    end if;
  end loop;

  select coalesce(jsonb_agg(
      (case when x->>'id' = p_actor
         then (case when v_kind = 'attack' then x - 'helped' else x end) || jsonb_build_object('used', v_used)
         when coalesce((p_payload->>'help')::boolean, false) and coalesce(p_payload->'targets', '[]'::jsonb) ? (x->>'id')
         then x || '{"helped":true}'::jsonb
         else x end)
      || case when v_statuses ? (x->>'id') then jsonb_build_object('status', v_statuses->>(x->>'id')) else '{}'::jsonb end), '[]'::jsonb)
    into v_list from jsonb_array_elements(v_combat->'combatants') x;
  update campaigns set combat = v_combat || jsonb_build_object('combatants', v_list,
    'reactions', coalesce((select jsonb_agg(r) from jsonb_array_elements(coalesce(v_combat->'reactions', '[]'::jsonb)) r
                           where r->>'id' is distinct from p_payload->>'opportunity'), '[]'::jsonb))
  where id = p_campaign;
  insert into campaign_secrets (campaign_id, data) values (p_campaign, v_secrets)
    on conflict (campaign_id) do update set data = excluded.data, updated_at = now();
  return v_results;
end $$;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;

grant execute on function public.combat_act(uuid, text, jsonb) to authenticated;
