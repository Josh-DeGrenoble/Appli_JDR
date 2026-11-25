-- Tests SQL de 010 : chemins, murs, terrain difficile, attaques d’opportunité, sauvegardes, hors combat, désengagement.
\set ON_ERROR_STOP 1
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into campaigns(id, name, gm_id, join_code) values ('10000000-0000-0000-0000-000000000000', 'T', '00000000-0000-0000-0000-000000000001', 'ABC');
insert into members values ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'gm', 'MJ'),
                           ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'player', 'Jo');
insert into characters(id, campaign_id, owner_id, name, resources, sheet) values ('20000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'Thalia',
  '{"pv":{"current":20,"max":20}}', '{"speed":9,"ac":15,"level":3,"abilities":{"dex":14},"saveProf":["dex"]}');
update campaigns set combat = '{"active":true,"round":1,"turn":0,"map":{"cols":12,"rows":16,"cells":{"4,4":"wall","2,5":"difficult"}},
 "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[]},
               {"id":"g","name":"Gobelin","kind":"monster","initiative":10,"initBonus":2,"x":3,"y":2,"status":"indemne","conditions":[]}]}'
 where id = '10000000-0000-0000-0000-000000000000';
insert into campaign_secrets values ('10000000-0000-0000-0000-000000000000', '{"monsters":{"g":{"hp":7,"maxHp":7,"ac":13,"saves":{"dex":2}}}}');

do $$
declare v jsonb; r text; res jsonb; ok boolean;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  -- 1. quitter le contact : attaque d'opportunité en attente, 3 m dépensés
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 2, 0);
  select combat into v from campaigns;
  assert jsonb_array_length(v->'reactions') = 1, 'réaction créée';
  assert v->'reactions'->0->>'by' = 'g', 'par le gobelin';
  assert (select (x->'used'->>'moved')::numeric from jsonb_array_elements(v->'combatants') x where x->>'id'='me') = 3, 'moved 3';
  -- 2. trop loin (terrain difficile compté)
  begin perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 2, 6); ok := false;
  exception when others then ok := sqlerrm like 'Trop loin%'; end;
  assert ok, 'trop loin';
  -- 2b. 4 cases sans terrain difficile : ok
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 2, 4);
  -- 3. mur
  begin perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 4, 4); ok := false;
  exception when others then ok := sqlerrm like '%infranchissable%'; end;
  assert ok, 'mur';
  -- 6a. le joueur ne peut pas ignorer la réaction du gobelin
  select combat into v from campaigns; r := v->'reactions'->0->>'id';
  begin perform combat_dismiss('10000000-0000-0000-0000-000000000000', r); ok := false;
  exception when others then ok := sqlerrm like '%ta réaction%'; end;
  assert ok, 'dismiss refusé au joueur';
  -- 4. MJ : attaque d'opportunité du gobelin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  res := combat_act('10000000-0000-0000-0000-000000000000', 'g',
    jsonb_build_object('kind','attack','economy','reaction','targets',jsonb_build_array('me'),'total',25,'natural',10,'damage',5,'opportunity',r));
  assert res->0->>'hit' = 'true', 'touché';
  select combat into v from campaigns;
  assert jsonb_array_length(v->'reactions') = 0, 'réaction retirée';
  assert (select (resources->'pv'->>'current')::int from characters) = 15, 'PV 15';
  -- 5. sauvegarde du perso : jet renvoyé
  res := combat_act('10000000-0000-0000-0000-000000000000', 'g',
    '{"kind":"save","economy":"free","targets":["me"],"damage":10,"dc":30,"ability":"dex","half":true}');
  assert (res->0->>'roll')::int between 5 and 24, 'jet renvoyé (d20 + 4)';
  assert res->0->>'saved' = 'false', 'raté contre DD 30';
  -- 7. hors combat : déplacement libre du joueur
  update campaigns set combat = combat || '{"active":false}';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 11, 15);
  -- 8. Se désengager : pas de réaction
  update campaigns set combat = jsonb_set(combat || '{"active":true}', '{combatants}',
    '[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[],"used":{"disengage":1}},
      {"id":"g","name":"Gobelin","kind":"monster","initiative":10,"initBonus":2,"x":3,"y":2,"status":"indemne","conditions":[]}]');
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 1, 2);
  select combat into v from campaigns;
  assert jsonb_array_length(coalesce(v->'reactions','[]')) = 0, 'désengagé';
  raise notice 'SQL 010 OK';
end $$;
