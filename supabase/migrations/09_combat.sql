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
