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
