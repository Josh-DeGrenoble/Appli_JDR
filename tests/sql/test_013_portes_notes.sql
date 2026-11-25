-- Tests SQL de 013 : portes (passage, ouverture par le MJ ou un joueur au contact), notes révélées (RLS).
\set ON_ERROR_STOP 1
do $$
declare ok boolean;
begin
  update campaigns set combat = jsonb_set(combat || '{"active":false}', '{map,cells}', '{"3,2":"door"}')
    where id = '10000000-0000-0000-0000-000000000000';
  update campaigns set combat = jsonb_set(combat, '{combatants}',
    '[{"id":"me","name":"Thalia","kind":"pc","characterId":"20000000-0000-0000-0000-000000000000","initiative":20,"initBonus":2,"x":2,"y":2,"conditions":[]}]')
    where id = '10000000-0000-0000-0000-000000000000';
  assert public._move_cost((select combat from campaigns where id = '10000000-0000-0000-0000-000000000000'),
    '{"id":"zz","kind":"pc","x":2,"y":2}', 3, 2, 5) is null, 'porte fermée infranchissable';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur, perso en (2,2)
  perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2);
  assert (select combat->'map'->'cells'->>'3,2' from campaigns where id = '10000000-0000-0000-0000-000000000000') = 'door-open', 'ouverte';
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 3, 2);
  begin perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2); ok := false;
  exception when others then ok := sqlerrm like '%bloque la porte%'; end;
  assert ok, 'on ne ferme pas une porte sur quelqu’un';
  perform combat_move('10000000-0000-0000-0000-000000000000', 'me', 9, 9);
  begin perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2); ok := false;
  exception when others then ok := sqlerrm like '%Approche-toi%'; end;
  assert ok, 'trop loin pour fermer';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false); -- MJ
  perform toggle_door('10000000-0000-0000-0000-000000000000', 3, 2);
  assert (select combat->'map'->'cells'->>'3,2' from campaigns where id = '10000000-0000-0000-0000-000000000000') = 'door', 'MJ ferme';
  raise notice 'SQL 013 portes OK';
end $$;

grant select, insert, update on public.notes to authenticated;
set test.uid = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
insert into notes(id, campaign_id, author_id, author_name, title, content, visibility) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'MJ', 'Secret de la crypte', '...', 'gm');
set test.uid = '00000000-0000-0000-0000-00000000000b';
do $$ begin assert (select count(*) from notes where id = 'f0000000-0000-0000-0000-000000000001') = 0, 'note préparée invisible'; end $$;
set test.uid = '00000000-0000-0000-0000-00000000000a';
update notes set reader_ids = array['00000000-0000-0000-0000-00000000000b']::uuid[] where id = 'f0000000-0000-0000-0000-000000000001';
set test.uid = '00000000-0000-0000-0000-00000000000b';
do $$ begin assert (select count(*) from notes where id = 'f0000000-0000-0000-0000-000000000001') = 1, 'révélée à Jo'; end $$;
set test.uid = '00000000-0000-0000-0000-00000000000c';
do $$ begin assert (select count(*) from notes where id = 'f0000000-0000-0000-0000-000000000001') = 0, 'pas à Léa'; raise notice 'SQL 013 notes OK'; end $$;
reset role;
