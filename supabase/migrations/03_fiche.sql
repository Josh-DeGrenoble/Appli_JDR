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
