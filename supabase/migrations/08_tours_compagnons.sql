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
