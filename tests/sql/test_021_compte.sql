-- Tests SQL de 021 : le pseudo change dans toutes mes campagnes, pas celui des autres.
\set ON_ERROR_STOP 1
do $$
declare ok boolean;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  perform set_display_name('  Aria la Brave ');
  assert (select display_name from members where user_id = '00000000-0000-0000-0000-000000000002' limit 1) = 'Aria la Brave', 'renommé';
  assert (select display_name from members where user_id = '00000000-0000-0000-0000-000000000001' limit 1) = 'MJ', 'MJ inchangé';
  begin perform set_display_name('   '); ok := false;
  exception when others then ok := sqlerrm like 'Pseudo invalide%'; end;
  assert ok, 'vide refusé';
  raise notice 'SQL 021 OK';
end $$;
