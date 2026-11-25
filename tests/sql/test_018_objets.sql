-- Tests SQL de 018 : effets des objets (armure, bouclier, cape, gantelets, arme), recalcul à chaque changement,
-- retrait sans cumul, dépôt dans un coffre, bonus de sauvegarde contre un piège.
\set ON_ERROR_STOP 1
do $$
declare v jsonb; ok boolean; v_shop uuid := 'c0000000-0000-0000-0000-000000000000'; v_mail uuid; v_cape uuid; v_sword uuid; r text;
begin
  assert public._item_effects('Cotte de mailles')->'armor'->>'base' = '16', 'effets cotte';
  assert public._item_effects('Inconnu') is null;
  assert public._library_price('Épée longue +1') = 100000, 'prix';

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false); -- MJ
  delete from items where character_id = '20000000-0000-0000-0000-000000000000';
  update characters set resources = '{"pv":{"current":20,"max":20}}',
    sheet = '{"className":"Guerrier","level":1,"ac":12,"speed":9,"abilities":{"str":12,"dex":14,"con":12,"int":10,"wis":10,"cha":10},"saveProf":["str"],"attacks":[{"id":"a1","name":"Poing"}],"spells":[],"features":[]}'
    where id = '20000000-0000-0000-0000-000000000000';
  insert into items (campaign_id, character_id, name, qty, description) values
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Cotte de mailles', 1, ''),
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Cape de protection', 1, ''),
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Rapière +1', 1, ''),
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Gantelets de puissance d’ogre', 1, ''),
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Corde de chanvre (15 m)', 1, '');
  select id into v_mail from items where name = 'Cotte de mailles';
  select id into v_cape from items where name = 'Cape de protection';
  select id into v_sword from items where name = 'Rapière +1';

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur : équipe
  update items set equipped = true where character_id = '20000000-0000-0000-0000-000000000000' and name <> 'Corde de chanvre (15 m)';
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert (v->>'ac')::int = 17, 'cotte 16 + cape 1 : ' || (v->>'ac');
  assert (v->'abilities'->>'str')::int = 19, 'gantelets FOR 19';
  assert (v->'gear'->>'saves')::int = 1 and (v->'gear'->>'ac')::int = 5, 'gear';
  assert (select count(*) from jsonb_array_elements(v->'attacks') a where a->>'id' = 'gear-' || v_sword
          and a->>'ability' = 'str' and (a->>'bonus')::int = 1) = 1, 'rapière (FOR 19 > DEX 14)';
  assert (select count(*) from jsonb_array_elements(v->'attacks')) = 2, 'poing gardé';

  -- Retirer la cotte : CA de base 12 + cape ; puis tout retirer : retour exact à la fiche de départ
  update items set equipped = false where id = v_mail;
  assert (select (sheet->>'ac')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 13, 'sans cotte : 12 + 1';
  update items set equipped = false where character_id = '20000000-0000-0000-0000-000000000000';
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert (v->>'ac')::int = 12 and (v->'abilities'->>'str')::int = 12 and jsonb_array_length(v->'attacks') = 1, 'retour au départ';
  update items set equipped = true where id = v_cape;
  assert (select (sheet->>'ac')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 13, 'pas de cumul';

  -- Dépôt dans un coffre : caché → refusé ; visible → l'objet passe dans le coffre (et la cape déposée ne compte plus)
  insert into shops (id, campaign_id, name, kind, visible) values (v_shop, '10000000-0000-0000-0000-000000000000', 'Coffre', 'chest', false);
  begin perform deposit_item(v_cape, v_shop, 1); ok := false;
  exception when others then ok := sqlerrm like '%pas disponible%'; end;
  assert ok, 'coffre caché';
  update shops set visible = true where id = v_shop;
  perform deposit_item(v_cape, v_shop, 1);
  assert not exists (select 1 from items where id = v_cape), 'cape partie';
  assert (select qty from shop_items where shop_id = v_shop and name = 'Cape de protection') = 1, 'cape dans le coffre';
  assert (select (sheet->>'ac')::int from characters where id = '20000000-0000-0000-0000-000000000000') = 12, 'CA sans la cape';
  begin perform deposit_item(v_mail, '00000000-0000-0000-0000-000000000000', 1); ok := false;
  exception when others then ok := sqlerrm like 'Dépôt impossible%'; end;
  assert ok, 'coffre inconnu';
  raise notice 'SQL 018 OK';
end $$;
