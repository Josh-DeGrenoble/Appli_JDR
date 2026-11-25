-- Tests SQL de 027 : torche éteinte puis rallumée par le joueur au contact, refusée de loin.
\set ON_ERROR_STOP 1
do $$
declare ok boolean;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update campaigns set combat = '{"active":false,"round":0,"turn":0,"map":{"cols":12,"rows":16,"cells":{"3,2":"torch","9,9":"torch"}},
    "combatants":[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":null,"initBonus":2,"x":2,"y":2,"conditions":[]}]}'
    where id = '10000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2);
  assert (select combat->'map'->'cells'->>'3,2' from campaigns where id = '10000000-0000-0000-0000-000000000000') = 'torch-off', 'éteinte';
  perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2);
  assert (select combat->'map'->'cells'->>'3,2' from campaigns where id = '10000000-0000-0000-0000-000000000000') = 'torch', 'rallumée';
  begin perform toggle_door('10000000-0000-0000-0000-000000000000', 9, 9); ok := false;
  exception when others then ok := sqlerrm like 'Approche-toi de la torche%'; end;
  assert ok, 'trop loin';
  raise notice 'SQL 027 OK';
end $$;
