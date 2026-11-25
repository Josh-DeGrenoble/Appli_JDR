-- Tests SQL de 015 : Esquiver (used.dodge), Aider (helped posé puis consommé par une attaque).
\set ON_ERROR_STOP 1
do $$
declare v jsonb;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update characters set resources = '{"pv":{"current":20,"max":20}}' where id = '20000000-0000-0000-0000-000000000000';
  update campaigns set combat = '{"active":true,"round":1,"turn":0,"map":{"cols":12,"rows":16},
   "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[]},
                 {"id":"ally","name":"Bran","kind":"pc","initiative":15,"initBonus":1,"x":3,"y":2,"conditions":[]},
                 {"id":"g","name":"Gobelin","kind":"monster","initiative":10,"initBonus":2,"x":4,"y":2,"status":"indemne","conditions":[]}]}'
   where id = '10000000-0000-0000-0000-000000000000';
  perform combat_act('10000000-0000-0000-0000-000000000000', 'me', '{"kind":"none","economy":"action","targets":["ally"],"help":true}');
  select combat into v from campaigns where id = '10000000-0000-0000-0000-000000000000';
  assert (select (x->>'helped')::boolean from jsonb_array_elements(v->'combatants') x where x->>'id' = 'ally'), 'allié aidé';
  perform combat_act('10000000-0000-0000-0000-000000000000', 'ally', '{"kind":"attack","economy":"free","targets":["g"],"total":5,"natural":3,"damage":1}');
  select combat into v from campaigns where id = '10000000-0000-0000-0000-000000000000';
  assert not exists (select 1 from jsonb_array_elements(v->'combatants') x where x->>'id' = 'ally' and x ? 'helped'), 'aide consommée';
  perform combat_act('10000000-0000-0000-0000-000000000000', 'g', '{"kind":"none","economy":"free","targets":[],"dodge":true}');
  select combat into v from campaigns where id = '10000000-0000-0000-0000-000000000000';
  assert (select (x->'used'->>'dodge')::int from jsonb_array_elements(v->'combatants') x where x->>'id' = 'g') = 1, 'esquive';
  raise notice 'SQL 015 OK';
end $$;
