-- Tests SQL de 016 : emplacements, montée de niveau (PV, amélioration, expertise, sorts), porte verrouillée, objets.
\set ON_ERROR_STOP 1
do $$
declare ok boolean; v jsonb;
begin
  assert public._slots_for('Magicien', 5) = '{"1":{"max":4,"used":0},"2":{"max":3,"used":0},"3":{"max":2,"used":0}}'::jsonb, 'magicien 5';
  assert public._slots_for('Paladin', 5) = '{"1":{"max":4,"used":0},"2":{"max":2,"used":0}}'::jsonb, 'paladin 5';
  assert public._slots_for('Occultiste', 11) = '{"5":{"max":3,"used":0}}'::jsonb, 'occultiste 11';
  assert public._slots_for('Guerrier', 5) is null;

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update characters set resources = '{"pv":{"current":20,"max":22}}',
    sheet = '{"className":"Magicien","level":3,"hitDie":6,"abilities":{"str":8,"dex":14,"con":14,"int":16,"wis":12,"cha":10},"skills":{"arcana":1},"allowedLevel":5,"spells":[{"id":"s1","name":"Bouclier","level":1}],"spellcasting":{"slots":{"1":{"max":4,"used":3},"2":{"max":2,"used":0}}}}'
    where id = '20000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur propriétaire
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":5}', 3); ok := false;
  exception when others then ok := sqlerrm like '%un seul niveau%'; end;
  assert ok, 'un niveau à la fois';
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":4}', 9); ok := false;
  exception when others then ok := sqlerrm like '%PV gagnés%'; end;
  assert ok, 'd6 + 2 max';
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":4,"abilities":{"str":8,"dex":14,"con":14,"int":19,"wis":12,"cha":10}}', 5); ok := false;
  exception when others then ok := sqlerrm like 'Pas d’amélioration%'; end;
  assert ok, '+3 refusé';
  perform level_up('20000000-0000-0000-0000-000000000000',
    '{"level":4,"abilities":{"str":8,"dex":14,"con":14,"int":18,"wis":12,"cha":10},"spells":[{"id":"s1","name":"Bouclier","level":1},{"id":"s2","name":"Fracassement","level":2}],"spellcasting":{"preparedMax":7}}', 5);
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert (v->>'level')::int = 4 and (v->'abilities'->>'int')::int = 18, 'niveau 4, INT 18';
  assert (v->'spellcasting'->'slots'->'1'->>'used')::int = 3 and (v->'spellcasting'->'slots'->'2'->>'max')::int = 3, 'emplacements recalculés';
  assert (v->'spellcasting'->>'preparedMax')::int = 7;
  assert (select (resources->'pv'->>'max')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 27, 'PV max +5';
  begin perform level_up('20000000-0000-0000-0000-000000000000', '{"level":5,"spells":[{"id":"x","name":"Souhait","level":9}]}', 3); ok := false;
  exception when others then ok := sqlerrm like 'Sorts invalides%' or sqlerrm like 'Trop de sorts%'; end;
  assert ok, 'sorts anciens perdus ou trop hauts';

  -- Porte verrouillée : le joueur ne l'ouvre pas, le MJ la déverrouille
  update campaigns set combat = '{"active":false,"map":{"cols":12,"rows":16,"cells":{"3,2":"door-locked","5,5":"chest","6,6":"water"}},
    "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","x":2,"y":2,"conditions":[]}]}'
    where id = '10000000-0000-0000-0000-000000000000';
  begin perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2); ok := false;
  exception when others then ok := sqlerrm like '%Verrouillée%'; end;
  assert ok, 'joueur bloqué';
  assert public._move_cost((select combat from campaigns where id = '10000000-0000-0000-0000-000000000000'), '{"id":"z","kind":"pc","x":4,"y":5}', 5, 5, 5) is null, 'coffre infranchissable';
  assert public._move_cost((select combat from campaigns where id = '10000000-0000-0000-0000-000000000000'), '{"id":"z","kind":"pc","x":5,"y":6}', 6, 6, 5) = 2, 'eau : terrain difficile';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2);
  assert (select combat->'map'->'cells'->>'3,2' from campaigns where id = '10000000-0000-0000-0000-000000000000') = 'door', 'déverrouillée';
  raise notice 'SQL 016 OK';
end $$;
