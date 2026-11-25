-- Tests SQL de 017 : droits du joueur (niveau, XP, épuisement), niveau accordé, sous-classe, historique, level_down,
-- dés serveur, pièges (joueur hors combat, MJ hors combat sans effet, monstre en combat).
\set ON_ERROR_STOP 1
do $$
declare ok boolean; v jsonb; r text; n int;
begin
  -- Fiche de départ : guerrier niveau 2, rien d'accordé
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update characters set resources = '{"pv":{"current":20,"max":20}}',
    sheet = '{"className":"Guerrier","level":2,"hitDie":10,"xp":300,"abilities":{"str":16,"dex":14,"con":14,"int":10,"wis":12,"cha":8},"saveProf":["str","con"],"features":[],"spells":[]}'
    where id = '20000000-0000-0000-0000-000000000000';

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur
  foreach r in array array['{"level":3}', '{"xp":900}', '{"exhaustion":0}', '{"allowedLevel":5}'] loop
    begin perform patch_sheet('20000000-0000-0000-0000-000000000000', r::jsonb); ok := false;
    exception when others then ok := sqlerrm like 'Réservé au MJ%'; end;
    assert ok, 'joueur ne touche pas à ' || r;
  end loop;
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"languages":"Commun"}');
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":3}', 6); ok := false;
  exception when others then ok := sqlerrm like '%pas encore accordé%'; end;
  assert ok, 'niveau non accordé';

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false); -- MJ accorde
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"xp":900,"allowedLevel":3,"exhaustion":2}');
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":3,"subclass":""}', 6); ok := false;
  exception when others then ok := sqlerrm like 'Sous-classe%'; end;
  assert ok, 'sous-classe vide refusée';
  perform level_up('20000000-0000-0000-0000-000000000000', '{"level":3,"subclass":"Champion","features":[{"id":"f","name":"Critique amélioré"}]}', 6);
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert (v->>'level')::int = 3 and v->>'subclass' = 'Champion', 'niveau 3 Champion';
  assert jsonb_array_length(v->'levelHistory') = 1 and (v->'levelHistory'->0->>'hpGain')::int = 6, 'historique';
  assert v->'levelHistory'->0->'before'->>'subclass' = '', 'avant : sans sous-classe';
  assert (select (resources->'pv'->>'max')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 26, 'PV +6';
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":4}', 6); ok := false;
  exception when others then ok := sqlerrm like '%pas encore accordé%'; end;
  assert ok, 'niveau 4 pas accordé';
  begin perform level_down('20000000-0000-0000-0000-000000000000'); ok := false;
  exception when others then ok := sqlerrm like 'Réservé au MJ%'; end;
  assert ok, 'level_down MJ seul';

  -- MJ : +1 accordé puis −1 (retire l'accord), puis −1 (annule la montée)
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"allowedLevel":4}');
  perform level_down('20000000-0000-0000-0000-000000000000');
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert (v->>'level')::int = 3 and (v->>'allowedLevel')::int = 3, 'accord retiré';
  perform level_down('20000000-0000-0000-0000-000000000000');
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert (v->>'level')::int = 2 and v->>'subclass' = '' and jsonb_array_length(v->'levelHistory') = 0, 'montée annulée';
  assert (select (resources->'pv'->>'max')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 20, 'PV −6';
  perform level_down('20000000-0000-0000-0000-000000000000');
  assert (select (sheet->>'level')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 1, 'sans historique : −1';

  -- Dés
  for n in 1..50 loop
    assert public._roll('2d10') between 2 and 20, '2d10';
    assert public._roll('1d4+3') between 4 and 7, '1d4+3';
  end loop;
  assert public._roll('5') = 5;

  -- Pièges : le MJ place hors combat → rien ; le joueur marche dessus → sauvegarde et dégâts
  update campaigns set combat = '{"active":false,"map":{"cols":12,"rows":16,"cells":{"5,5":"trap","6,6":"trap"}},
    "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","x":4,"y":4,"conditions":[]},
                  {"id":"g","name":"Gobelin","kind":"monster","initiative":10,"x":8,"y":8,"status":"indemne","conditions":[]}]}'
    where id = '10000000-0000-0000-0000-000000000000';
  update campaign_secrets set data = '{"monsters":{"g":{"hp":30,"maxHp":30,"ac":13,"saves":{"dex":-20}}},"traps":{"6,6":{"name":"Fosse","dc":30,"ability":"dex","damage":"3","half":false}}}'
    where campaign_id = '10000000-0000-0000-0000-000000000000';
  r := combat_move('10000000-0000-0000-0000-000000000000', 'me', 5, 5);
  assert r is null, 'MJ hors combat : pas de piège';
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 4, 4);
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  r := combat_move('10000000-0000-0000-0000-000000000000', 'me', 5, 5);
  assert r like '🪤 Piège ! Thalia : sauvegarde DEX %', 'récit : ' || coalesce(r, 'null');
  assert (select combat->'map'->'cells'->>'5,5' from campaigns where id = '10000000-0000-0000-0000-000000000000') = 'trap-sprung', 'piège visible';
  assert (select (resources->'pv'->>'current')::int from characters where id = '20000000-0000-0000-0000-000000000000') < 20
      or r like '%réussie%', 'dégâts';
  -- Monstre en combat (DD 30, 3 dégâts fixes)
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update campaigns set combat = jsonb_set(combat, '{active}', 'true') where id = '10000000-0000-0000-0000-000000000000';
  r := combat_move('10000000-0000-0000-0000-000000000000', 'g', 6, 6);
  assert r = '🪤 Fosse ! Gobelin : sauvegarde DEX ' || split_part(split_part(r, 'DEX ', 2), ' ', 1) || ' contre DD 30, ratée · 3 dégâts', 'récit monstre : ' || r;
  assert (select (data->'monsters'->'g'->>'hp')::int from campaign_secrets where campaign_id = '10000000-0000-0000-0000-000000000000') = 27, 'monstre −3';
  assert (select x->>'status' from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'id' = 'g') = 'blessé', 'statut';
  raise notice 'SQL 017 OK';
end $$;
