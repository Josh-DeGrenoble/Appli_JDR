-- Tests SQL de 011 : paiement avec rendu de monnaie, achat atomique, visibilité, coffre, droits.
\set ON_ERROR_STOP 1
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
insert into campaigns(id, name, gm_id, join_code) values ('a0000000-0000-0000-0000-000000000000', 'M', '00000000-0000-0000-0000-00000000000a', 'MAR');
insert into members values ('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'gm', 'MJ'),
                           ('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'player', 'Jo'),
                           ('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000c', 'player', 'Léa');
insert into characters(id, campaign_id, owner_id, name, sheet) values ('b0000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'Thalia', '{"coins":{"po":20}}');
insert into shops(id, campaign_id, name, kind, visible) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Echoppe', 'merchant', false),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'Coffre', 'chest', true);
insert into shop_items(id, shop_id, campaign_id, name, qty, price_cp, description, heal) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Potion de soins', 2, 150, 'Rend 2d4+2 PV.', '2d4+2'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'Rubis', 1, 0, '', null);

do $$
declare ok boolean; v jsonb;
begin
  assert public._pay_coins('{"po":20}', 150) = '{"pp":0,"po":18,"pe":0,"pa":5,"pc":0}'::jsonb, 'monnaie rendue';
  assert public._pay_coins('{"pp":1,"pc":3}', 1) = '{"pp":1,"po":0,"pe":0,"pa":0,"pc":2}'::jsonb, 'garde le platine';
  begin perform public._pay_coins('{"po":1}', 101); ok := false; exception when others then ok := sqlerrm like 'Pas assez%'; end;
  assert ok, 'pas assez';

  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000b', false);
  begin perform buy_item('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 1); ok := false;
  exception when others then ok := sqlerrm like '%pas disponible%'; end;
  assert ok, 'marchand caché';
  update shops set visible = true where id = 'c0000000-0000-0000-0000-000000000001';
  perform buy_item('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 2);
  select sheet->'coins' into v from characters where id = 'b0000000-0000-0000-0000-000000000000';
  assert (v->>'po')::int = 17 and (v->>'pa')::int = 0, 'payé 3 po : ' || v::text;
  assert not exists (select 1 from shop_items where id = 'd0000000-0000-0000-0000-000000000001'), 'stock épuisé';
  assert (select qty from items where name = 'Potion de soins') = 2, 'potions dans le sac';
  assert (select heal from items where name = 'Potion de soins') = '2d4+2', 'formule de soin gardée';
  perform buy_item('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000000', 1);
  assert (select (sheet->'coins'->>'po')::int from characters where id = 'b0000000-0000-0000-0000-000000000000') = 17, 'coffre gratuit';
  assert exists (select 1 from items where name = 'Rubis'), 'rubis pris';

  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000c', false);
  insert into shop_items(id, shop_id, campaign_id, name, qty, price_cp) values
    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Corde', 1, 100);
  begin perform buy_item('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000000', 1); ok := false;
  exception when others then ok := sqlerrm like '%ton personnage%'; end;
  assert ok, 'acheter pour le perso d’un autre';
  raise notice 'SQL 011 OK';
end $$;
