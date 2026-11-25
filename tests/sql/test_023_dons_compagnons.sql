-- Tests SQL de 023 : don à la montée de niveau (Résilient, Robuste, refus), annulation, compagnons (venir, bouger,
-- être blessé, repartir), Mage de guerre, fiche (compagnons et vision modifiables par le joueur).
\set ON_ERROR_STOP 1
do $$
declare ok boolean; v jsonb; r jsonb; tok text;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false); -- MJ
  update characters set resources = '{"pv":{"current":30,"max":30}}',
    sheet = '{"className":"Guerrier","level":3,"allowedLevel":5,"hitDie":10,"speed":9,"abilities":{"str":16,"dex":14,"con":14,"int":10,"wis":12,"cha":8},"saveProf":["str","con"],"skills":{},"features":[],"spells":[],"attacks":[]}'
    where id = '20000000-0000-0000-0000-000000000000';
  assert public._feat_info('Initié à la magie (clerc)')->>'spellsOf' = 'true', 'don lu sans la précision';

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"darkvision":18,"companions":[{"id":"loup","name":"Loup","avatar":"🐺","hp":11,"maxHp":11,"ac":13,"speed":12,"attacks":[],"saves":{"dex":2}}]}');
  -- Deux dons d'un coup, don inconnu, vitesse truquée : refusés
  foreach tok in array array['{"level":4,"feats":["Robuste","Mobile"]}', '{"level":4,"feats":["Triche"]}', '{"level":4,"feats":["Robuste"],"speed":12}',
                             '{"level":4,"feats":["Robuste"],"abilities":{"str":18,"dex":14,"con":14,"int":10,"wis":12,"cha":8}}'] loop
    begin perform level_up('20000000-0000-0000-0000-000000000000', tok::jsonb, 6); ok := false;
    exception when others then ok := true; end;
    assert ok, 'refusé : ' || tok;
  end loop;
  -- Résilient (DEX +1, sauvegarde de DEX)
  perform level_up('20000000-0000-0000-0000-000000000000', '{"level":4,"feats":["Résilient"],"abilities":{"str":16,"dex":15,"con":14,"int":10,"wis":12,"cha":8},"saveProf":["str","con","dex"]}', 6);
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert v->'feats' = '["Résilient"]' and v->'saveProf' ? 'dex' and (v->'abilities'->>'dex')::int = 15, 'Résilient';
  -- Annulé par le MJ : plus de don, PV rendus
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  perform level_down('20000000-0000-0000-0000-000000000000'); -- niveau accordé 5 → 4
  perform level_down('20000000-0000-0000-0000-000000000000'); -- niveau 4 → 3
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"allowedLevel":5}');
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert v->'feats' = '[]' and not v->'saveProf' ? 'dex' and (v->>'level')::int = 3, 'annulé';
  -- Robuste : 6 + 2 × 4 PV
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  perform level_up('20000000-0000-0000-0000-000000000000', '{"level":4,"feats":["Robuste"]}', 14);
  assert (select (resources->'pv'->>'max')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 44, 'Robuste +14';
  -- Pas de don au niveau 5
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":5,"feats":["Robuste","Mobile"]}', 6); ok := false;
  exception when others then ok := sqlerrm like 'Pas de don%'; end;
  assert ok, 'pas de don au niveau 5';
  -- Niveau 5 : Robuste déjà pris → +2
  perform level_up('20000000-0000-0000-0000-000000000000', '{"level":5}', 8);
  assert (select (resources->'pv'->>'max')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 52, 'Robuste +2 par niveau';

  -- Compagnon : vient à côté de son maître
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update campaigns set combat = '{"active":true,"round":1,"turn":0,"map":{"cols":12,"rows":16},
    "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[]},
                  {"id":"g","name":"Gobelin","kind":"monster","initiative":10,"initBonus":2,"x":6,"y":2,"status":"indemne","conditions":[],"attacks":[]}]}'
    where id = '10000000-0000-0000-0000-000000000000';
  update campaign_secrets set data = '{"monsters":{"g":{"hp":20,"maxHp":20,"ac":12}}}' where campaign_id = '10000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  perform summon_companion('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'loup');
  begin perform summon_companion('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'loup'); ok := false;
  exception when others then ok := sqlerrm like '%déjà sur la carte%'; end;
  assert ok, 'pas deux fois';
  select x into v from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'companionOf' = 'loup';
  tok := v->>'id';
  assert greatest(abs((v->>'x')::int - 2), abs((v->>'y')::int - 2)) = 1 and (v->'companion'->>'hp')::int = 11 and (v->>'initBonus')::int = 1, 'loup à côté';

  -- Le gobelin mord le loup : 5 dégâts sur ses propres PV, puis 10 : vaincu
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  r := combat_act('10000000-0000-0000-0000-000000000000', 'g', jsonb_build_object('kind', 'attack', 'economy', 'free', 'targets', jsonb_build_array(tok), 'total', 14, 'natural', 8, 'damage', 5));
  assert (r->0->>'hit')::boolean, 'touché (CA 13)';
  select x into v from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'id' = tok;
  assert (v->'companion'->>'hp')::int = 6, 'PV du loup';
  assert (select (resources->'pv'->>'current')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 52, 'maître intact';
  perform combat_act('10000000-0000-0000-0000-000000000000', 'g', jsonb_build_object('kind', 'attack', 'economy', 'free', 'targets', jsonb_build_array(tok), 'total', 20, 'natural', 15, 'damage', 10));
  select x into v from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'id' = tok;
  assert (v->'companion'->>'hp')::int = 0 and v->>'status' = 'vaincu', 'loup vaincu';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  begin perform combat_move('10000000-0000-0000-0000-000000000000', tok, 3, 4); ok := false;
  exception when others then ok := sqlerrm like 'À terre%'; end;
  assert ok, 'loup à terre immobile';
  perform dismiss_companion('10000000-0000-0000-0000-000000000000', tok);
  assert not exists (select 1 from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'id' = tok), 'loup reparti';
  begin perform dismiss_companion('10000000-0000-0000-0000-000000000000', 'g'); ok := false;
  exception when others then ok := true; end;
  assert ok, 'un monstre n’est pas un compagnon';
  assert public._has_conc_adv('{"feats":["Mage de guerre"]}') and not public._has_conc_adv('{"feats":["Robuste"]}'), 'Mage de guerre';
  raise notice 'SQL 023-025 OK';
end $$;
