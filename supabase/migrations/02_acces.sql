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
