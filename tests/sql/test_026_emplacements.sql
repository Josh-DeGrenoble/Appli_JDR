-- Tests SQL de 026 : emplacements (même liste que tests/dons.test.ts), une seule paire de bottes, deux anneaux.
\set ON_ERROR_STOP 1
do $$
declare ok boolean; v_b uuid; v_b2 uuid; v_r1 uuid; v_r2 uuid; v_r3 uuid;
begin
  assert public._item_slot('Cotte de mailles +1') = 'armure' and public._item_slot('Bouclier +2') = 'bouclier', 'armure, bouclier';
  assert public._item_slot('Bottes elfiques') = 'bottes' and public._item_slot('Gantelets de puissance d’ogre') = 'gants', 'bottes, gants';
  assert public._item_slot('Bandeau d’intellect') = 'tete' and public._item_slot('Amulette de santé') = 'cou', 'tête, cou';
  assert public._item_slot('Ceinturon de force de géant des collines') = 'ceinture' and public._item_slot('Cape de protection') = 'cape', 'ceinture, cape';
  assert public._item_slot('Anneau de protection') = 'anneau' and public._item_slot('Bracelets de défense') = 'bracelets', 'anneau, bracelets';
  assert public._item_slot('Diadème en or') = 'tete' and public._item_slot('Écu du roi') = 'bouclier', 'objets maison';
  assert public._item_slot('Épée longue +1') is null and public._item_slot('Pierre de Ioun (protection)') is null, 'sans emplacement';

  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  delete from items where character_id = '20000000-0000-0000-0000-000000000000';
  insert into items (campaign_id, character_id, name, qty, description, equipped) values
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Bottes de vitesse', 1, '', true) returning id into v_b;
  insert into items (campaign_id, character_id, name, qty, description) values
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Bottes elfiques', 1, '') returning id into v_b2;
  begin update items set equipped = true where id = v_b2; ok := false;
  exception when others then ok := sqlerrm like 'Emplacement pieds déjà pris (Bottes de vitesse)%'; end;
  assert ok, 'deux paires de bottes refusées';
  update items set equipped = false where id = v_b;
  update items set equipped = true where id = v_b2;
  insert into items (campaign_id, character_id, name, qty, description, equipped) values
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Anneau de protection', 1, '', true),
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Bague en argent', 1, '', true);
  begin
    insert into items (campaign_id, character_id, name, qty, description, equipped) values
      ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Anneau de feu', 1, '', true);
    ok := false;
  exception when others then ok := sqlerrm like 'Emplacement anneaux%'; end;
  assert ok, 'trois anneaux refusés';
  raise notice 'SQL 026 OK';
end $$;

-- 028 : arme à deux mains et bouclier
do $$
declare ok boolean; v_s uuid;
begin
  assert public._two_handed('Épée à deux mains') and public._two_handed('Arc long +1') and not public._two_handed('Épée longue'), 'deux mains';
  insert into items (campaign_id, character_id, name, qty, description, equipped) values
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Épée à deux mains', 1, '', true);
  insert into items (campaign_id, character_id, name, qty, description) values
    ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000', 'Bouclier', 1, '') returning id into v_s;
  begin update items set equipped = true where id = v_s; ok := false;
  exception when others then ok := sqlerrm like 'Arme à deux mains et bouclier ne vont pas ensemble (Épée à deux mains)%'; end;
  assert ok, 'bouclier refusé avec une arme à deux mains';
  raise notice 'SQL 028 OK';
end $$;
