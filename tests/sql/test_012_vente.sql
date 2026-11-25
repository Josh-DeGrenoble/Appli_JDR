-- Tests SQL : décor (table, buisson), revente moitié prix.
\set ON_ERROR_STOP 1
do $$
declare ok boolean; v jsonb;
begin
  -- Revente (données de test 011 : Thalia a 2 potions ? non, elles ont été bues ; on lui donne une épée longue)
  perform set_config('grimoire.allow_items', 'on', false);
  insert into items(id, campaign_id, character_id, name, qty, description) values
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Épée longue', 2, ''),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Caillou bizarre', 1, '');
  perform set_config('grimoire.allow_items', 'off', false);
  assert public._library_price('épée longue') = 1500, 'prix bibliothèque';
  update characters set sheet = jsonb_set(sheet, '{coins}', '{"po":1}') where id = 'b0000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000b', false);
  perform sell_item('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1);
  select sheet->'coins' into v from characters where id = 'b0000000-0000-0000-0000-000000000000';
  assert (v->>'po')::int = 8 and (v->>'pa')::int = 5, 'reçu 7 po 5 pa : ' || v::text;
  assert (select qty from items where id = 'e0000000-0000-0000-0000-000000000001') = 1, 'une épée en moins';
  assert (select price_cp from shop_items where name = 'Épée longue') = 1500, 'revendue au prix plein';
  begin perform sell_item('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 1); ok := false;
  exception when others then ok := sqlerrm like '%n’achète pas%'; end;
  assert ok, 'objet sans prix';
  update shops set buys = false where id = 'c0000000-0000-0000-0000-000000000001';
  begin perform sell_item('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1); ok := false;
  exception when others then ok := sqlerrm like '%n’achète rien%'; end;
  assert ok, 'marchand qui ne rachète pas';

  -- Décor : table infranchissable, buisson = terrain difficile (carte de la campagne 010)
  update campaigns set combat = jsonb_set(combat, '{map,cells}', '{"3,2":"table","2,3":"bush"}')
    where id = '10000000-0000-0000-0000-000000000000';
  assert public._move_cost((select combat from campaigns where id = '10000000-0000-0000-0000-000000000000'),
    '{"id":"zz","kind":"pc","x":2,"y":2}', 3, 2, 5) is null, 'table infranchissable';
  assert public._move_cost((select combat from campaigns where id = '10000000-0000-0000-0000-000000000000'),
    '{"id":"zz","kind":"pc","x":2,"y":2}', 2, 3, 5) = 2, 'buisson coûte 2';
  raise notice 'SQL 012 vente/décor OK';
end $$;

