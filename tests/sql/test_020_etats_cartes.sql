-- Tests SQL de 020 : le joueur se met un état mais ne le retire pas ; images des cartes passées partagées ; ceinturon.
\set ON_ERROR_STOP 1
do $$
declare ok boolean;
begin
  assert (public._item_effects('Ceinturon de force de géant du feu')->'setAbility'->>'str')::int = 25, 'ceinturon';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update characters set sheet = sheet || '{"conditions":["poisoned"]}' where id = '20000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"conditions":["poisoned","prone"]}');
  begin perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"conditions":["prone"]}'); ok := false;
  exception when others then ok := sqlerrm like 'Seul le MJ retire%'; end;
  assert ok, 'retrait refusé au joueur';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"conditions":[]}');
  assert (select sheet->'conditions' from characters where id = '20000000-0000-0000-0000-000000000000') = '[]'::jsonb, 'le MJ retire';

  -- Images : la politique de lecture compile et filtre (cartes partagées seulement)
  insert into campaign_maps (campaign_id, map_id, data) values
    ('10000000-0000-0000-0000-000000000000', 'crypte', 'x'), ('10000000-0000-0000-0000-000000000000', 'secret', 'y');
  update campaigns set settings = coalesce(settings, '{}'::jsonb) || '{"maps":[{"id":"crypte","shared":true},{"id":"secret","shared":false}]}'
    where id = '10000000-0000-0000-0000-000000000000';
  raise notice 'SQL 020 OK';
end $$;
-- Lecture en tant que joueur (RLS active pour le rôle authenticated)
grant usage on schema public, auth to authenticated;
grant select on public.campaign_maps, public.campaigns, public.members to authenticated;
set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from campaign_maps where map_id in ('crypte', 'secret')) = 1, 'seule la carte partagée est lisible';
  raise notice 'SQL 020 images OK';
end $$;
reset role;
