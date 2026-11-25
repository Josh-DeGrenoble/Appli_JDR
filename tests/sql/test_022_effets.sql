-- Tests SQL de 022 : effet posé (Bénédiction), Bouclier (+5 CA), résistance d'un monstre, concentration perdue.
\set ON_ERROR_STOP 1
do $$
declare v jsonb; r jsonb; ok boolean;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false); -- MJ
  update characters set resources = '{"pv":{"current":100,"max":100}}',
    sheet = '{"className":"Clerc","level":1,"ac":10,"abilities":{"str":10,"dex":10,"con":1,"int":10,"wis":14,"cha":10},"concentration":"Bénédiction"}'
    where id = '20000000-0000-0000-0000-000000000000';
  update campaigns set combat = '{"active":true,"round":3,"turn":0,"map":{"cols":12,"rows":16},
    "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[]},
                  {"id":"g","name":"Gobelin","kind":"monster","initiative":10,"initBonus":2,"x":3,"y":2,"status":"indemne","conditions":[]}]}'
    where id = '10000000-0000-0000-0000-000000000000';
  update campaign_secrets set data = '{"monsters":{"g":{"hp":20,"maxHp":20,"ac":12,"defenses":{"resist":["feu"]}}}}'
    where campaign_id = '10000000-0000-0000-0000-000000000000';

  -- Effet invalide refusé
  begin perform combat_act('10000000-0000-0000-0000-000000000000', 'me', '{"kind":"buff","economy":"free","targets":["me"],"effect":{"name":"Triche","rounds":500,"ac":20}}'); ok := false;
  exception when others then ok := sqlerrm like 'Effet invalide%'; end;
  assert ok, 'effet invalide';
  -- Bénédiction (concentration) puis Bouclier sur Thalia
  r := combat_act('10000000-0000-0000-0000-000000000000', 'me', '{"kind":"buff","economy":"free","targets":["me"],"effect":{"name":"Bénédiction","icon":"✨","rounds":10,"attack":"1d4","saves":"1d4","conc":true}}');
  assert r->0->>'kind' = 'buff', 'buff';
  perform combat_act('10000000-0000-0000-0000-000000000000', 'me', '{"kind":"buff","economy":"free","targets":["me"],"effect":{"name":"Bouclier","icon":"🛡️","rounds":1,"ac":5}}');
  select x into v from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'id' = 'me';
  assert jsonb_array_length(v->'effects') = 2 and (v->'effects'->0->>'until')::int = 12, 'effets posés (Bénédiction jusqu’au round 12)';
  assert public._effects_ac(v, 3) = 5 and public._effects_ac(v, 4) = 0, 'Bouclier : 1 round';

  -- Le gobelin attaque à 14 : raté grâce au Bouclier (CA 15)
  r := combat_act('10000000-0000-0000-0000-000000000000', 'g', '{"kind":"attack","economy":"free","targets":["me"],"total":14,"natural":10,"damage":6}');
  assert (r->0->>'hit')::boolean = false, 'raté (Bouclier)';
  -- Touché, 40 dégâts : DD 20 ; CON 1 (−5) + 1d4 : 19 au plus → concentration perdue, Bénédiction tombée
  r := combat_act('10000000-0000-0000-0000-000000000000', 'g', '{"kind":"attack","economy":"free","targets":["me"],"total":21,"natural":15,"damage":40,"damageType":"tranchant"}');
  assert (r->0->'conc'->>'dc')::int = 20 and not (r->0->'conc'->>'kept')::boolean, 'sauvegarde de concentration ratée';
  assert (select sheet->>'concentration' from characters where id = '20000000-0000-0000-0000-000000000000') = '', 'concentration perdue';
  select x into v from campaigns, jsonb_array_elements(combat->'combatants') x where x->>'id' = 'me';
  assert not exists (select 1 from jsonb_array_elements(v->'effects') e where e->>'name' = 'Bénédiction'), 'Bénédiction tombée';
  assert exists (select 1 from jsonb_array_elements(v->'effects') e where e->>'name' = 'Bouclier'), 'Bouclier reste';

  -- Sort de feu sur le gobelin résistant : moitié
  r := combat_act('10000000-0000-0000-0000-000000000000', 'me', '{"kind":"auto","economy":"free","targets":["g"],"damage":9,"damageType":"feu"}');
  assert (r->0->>'amount')::int = 4 and r->0->>'note' = 'résistant', 'résistance au feu';
  assert (select (data->'monsters'->'g'->>'hp')::int from campaign_secrets where campaign_id = '10000000-0000-0000-0000-000000000000') = 16;
  raise notice 'SQL 022 OK';
end $$;
