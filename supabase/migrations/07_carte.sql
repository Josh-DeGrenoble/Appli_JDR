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
