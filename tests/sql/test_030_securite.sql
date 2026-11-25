-- Tests SQL : fiche protégée contre les écritures directes d'un joueur (rôle « authenticated », RLS active) et règle
-- de la table « les joueurs modifient leur fiche ».
\set ON_ERROR_STOP 1
grant usage on schema public to authenticated;
grant select, update on public.characters, public.campaigns, public.members to authenticated;
do $$
declare ok boolean;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false); -- joueur propriétaire de Thalia
  set local role authenticated;
  update characters set name = 'Thalia la Rouge' where id = '20000000-0000-0000-0000-000000000000';
  assert (select name from characters where id = '20000000-0000-0000-0000-000000000000') = 'Thalia la Rouge', 'nom modifiable';
  begin update characters set sheet = sheet || '{"level":20}' where id = '20000000-0000-0000-0000-000000000000'; ok := false;
  exception when others then ok := sqlerrm like 'Fiche modifiable seulement par l’appli%'; end;
  assert ok, 'écriture directe de la fiche refusée';
  reset role;
  -- Par la fonction de l'appli : autorisé (droits du serveur)
  perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"languages":"Commun, Elfique"}');
  -- Le MJ bloque les fiches : plus de caracs, mais les états restent possibles
  update campaigns set settings = settings || '{"playersEditStats":false}' where id = '10000000-0000-0000-0000-000000000000';
  begin perform patch_sheet('20000000-0000-0000-0000-000000000000', '{"ac":25}'); ok := false;
  exception when others then ok := sqlerrm like 'Le MJ a bloqué%'; end;
  assert ok, 'fiche bloquée par le MJ';
  perform patch_sheet('20000000-0000-0000-0000-000000000000', jsonb_build_object('conditions',
    coalesce((select sheet->'conditions' from characters where id = '20000000-0000-0000-0000-000000000000'), '[]'::jsonb) || '["prone"]'));
  update campaigns set settings = settings || '{"playersEditStats":true}' where id = '10000000-0000-0000-0000-000000000000';
  raise notice 'SQL sécurité OK';
end $$;

-- Historique de niveau léger : sorts mémorisés par identifiant, annuler retire seulement les sorts appris
do $$
declare v jsonb;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  update characters set resources = '{"pv":{"current":6,"max":6}}', sheet = '{"className":"Magicien","level":1,"allowedLevel":2,"abilities":{"con":10},
    "spells":[{"id":"a","name":"Trait de feu","level":0,"prepared":true}],"features":[]}' where id = '20000000-0000-0000-0000-000000000000';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
  perform level_up('20000000-0000-0000-0000-000000000000', '{"level":2,"spells":[{"id":"a","name":"Trait de feu","level":0,"prepared":false},{"id":"b","name":"Bouclier","level":1}]}', 4);
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert v->'levelHistory'->0->'before'->'spellIds' = '["a"]' and not v->'levelHistory'->0->'before' ? 'spells', 'historique léger';
  perform set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
  perform level_down('20000000-0000-0000-0000-000000000000');
  select sheet into v from characters where id = '20000000-0000-0000-0000-000000000000';
  assert jsonb_array_length(v->'spells') = 1 and v->'spells'->0->>'id' = 'a' and (v->>'level')::int = 1, 'sort appris retiré';
  raise notice 'SQL historique léger OK';
end $$;
