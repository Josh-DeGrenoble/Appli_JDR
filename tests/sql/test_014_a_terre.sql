-- Tests SQL de 014 : perso à 0 PV bloqué (action, déplacement), fin de tour par le joueur.
\set ON_ERROR_STOP 1
do $$
declare ok boolean; v jsonb;
begin
  update campaigns set combat = '{"active":true,"round":1,"turn":0,"map":{"cols":12,"rows":16},
   "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[]},
                 {"id":"g1","name":"Gobelin 1","kind":"monster","initiative":15,"initBonus":2,"x":8,"y":2,"status":"vaincu","conditions":[]},
                 {"id":"g2","name":"Gobelin 2","kind":"monster","initiative":10,"initBonus":2,"x":9,"y":2,"status":"indemne","conditions":[],"used":{"action":1}}]}'
   where id = '10000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update characters set resources = '{"pv":{"current":0,"max":20}}' where id = '20000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  begin perform combat_act('10000000-0000-0000-0000-000000000000', 'me', '{"kind":"none","economy":"action","targets":[]}'); ok := false;
  exception when others then ok := sqlerrm like 'À terre%'; end;
  assert ok, 'action refusée à 0 PV';
  begin perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 2, 3); ok := false;
  exception when others then ok := sqlerrm like 'À terre%'; end;
  assert ok, 'déplacement refusé à 0 PV';
  perform end_turn('10000000-0000-0000-0000-000000000000');
  select combat into v from campaigns where id = '10000000-0000-0000-0000-000000000000';
  assert (v->>'turn')::int = 2, 'gobelin vaincu sauté : ' || (v->>'turn');
  assert (select (x->'used'->>'action')::int from jsonb_array_elements(v->'combatants') x where x->>'id' = 'g2') = 0, 'actions rendues';
  begin perform end_turn('10000000-0000-0000-0000-000000000000'); ok := false;
  exception when others then ok := sqlerrm like '%pas ton tour%'; end;
  assert ok, 'pas le tour du joueur';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  perform end_turn('10000000-0000-0000-0000-000000000000');
  select combat into v from campaigns where id = '10000000-0000-0000-0000-000000000000';
  assert (v->>'turn')::int = 0 and (v->>'round')::int = 2, 'nouveau round';
  raise notice 'SQL 014 OK';
end $$;
