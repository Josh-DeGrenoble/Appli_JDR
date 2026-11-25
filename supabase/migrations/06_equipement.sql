-- 06 : Équipement : effets des objets de la bibliothèque (CA, caracs, armes), prix, emplacements, deux mains.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- ---------- Bibliothèque d'objets (généré par scripts/gen-objets-sql.ts).
create or replace function public._item_effects(p_name text) returns jsonb language sql immutable as $$
  select ('{"Dague":{"weapon":{"damage":"1d4","type":"perforant","ability":"finesse","range":1.5}},"Bâton":{"weapon":{"damage":"1d6","type":"contondant","ability":"str","range":1.5}},"Masse d’armes":{"weapon":{"damage":"1d6","type":"contondant","ability":"str","range":1.5}},"Lance":{"weapon":{"damage":"1d6","type":"perforant","ability":"str","range":1.5}},"Hachette":{"weapon":{"damage":"1d6","type":"tranchant","ability":"str","range":1.5}},"Épée courte":{"weapon":{"damage":"1d6","type":"perforant","ability":"finesse","range":1.5}},"Cimeterre":{"weapon":{"damage":"1d6","type":"tranchant","ability":"finesse","range":1.5}},"Rapière":{"weapon":{"damage":"1d8","type":"perforant","ability":"finesse","range":1.5}},"Épée longue":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5}},"Hache d’armes":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5}},"Marteau de guerre":{"weapon":{"damage":"1d8","type":"contondant","ability":"str","range":1.5}},"Morgenstern":{"weapon":{"damage":"1d8","type":"perforant","ability":"str","range":1.5}},"Coutille":{"weapon":{"damage":"1d10","type":"tranchant","ability":"str","range":3}},"Épée à deux mains":{"weapon":{"damage":"2d6","type":"tranchant","ability":"str","range":1.5}},"Hache à deux mains":{"weapon":{"damage":"1d12","type":"tranchant","ability":"str","range":1.5}},"Arc court":{"weapon":{"damage":"1d6","type":"perforant","ability":"dex","range":24}},"Arc long":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":45}},"Arbalète légère":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":24}},"Arbalète lourde":{"weapon":{"damage":"1d10","type":"perforant","ability":"dex","range":30}},"Armure matelassée":{"armor":{"base":11,"dexMax":null}},"Armure de cuir":{"armor":{"base":11,"dexMax":null}},"Armure de cuir clouté":{"armor":{"base":12,"dexMax":null}},"Armure de peau":{"armor":{"base":12,"dexMax":2}},"Chemise de mailles":{"armor":{"base":13,"dexMax":2}},"Cuirasse":{"armor":{"base":14,"dexMax":2}},"Demi-plate":{"armor":{"base":15,"dexMax":2}},"Cotte de mailles":{"armor":{"base":16,"dexMax":0}},"Harnois":{"armor":{"base":18,"dexMax":0}},"Bouclier":{"shield":2},"Dague +1":{"weapon":{"damage":"1d4","type":"perforant","ability":"finesse","range":1.5,"bonus":1}},"Épée longue +1":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":1}},"Rapière +1":{"weapon":{"damage":"1d8","type":"perforant","ability":"finesse","range":1.5,"bonus":1}},"Hache d’armes +1":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":1}},"Masse d’armes +1":{"weapon":{"damage":"1d6","type":"contondant","ability":"str","range":1.5,"bonus":1}},"Arc long +1":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":45,"bonus":1}},"Épée longue +2":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":2}},"Épée à deux mains +2":{"weapon":{"damage":"2d6","type":"tranchant","ability":"str","range":1.5,"bonus":2}},"Armure de cuir +1":{"armor":{"base":11,"dexMax":null},"ac":1},"Chemise de mailles +1":{"armor":{"base":13,"dexMax":2},"ac":1},"Cotte de mailles +1":{"armor":{"base":16,"dexMax":0},"ac":1},"Bouclier +1":{"shield":2,"ac":1},"Bouclier +2":{"shield":2,"ac":2},"Bouclier +3":{"shield":2,"ac":3},"Armure de cuir clouté +2":{"armor":{"base":12,"dexMax":null},"ac":2},"Demi-plate +1":{"armor":{"base":15,"dexMax":2},"ac":1},"Harnois +1":{"armor":{"base":18,"dexMax":0},"ac":1},"Arc long +2":{"weapon":{"damage":"1d8","type":"perforant","ability":"dex","range":45,"bonus":2}},"Épée longue +3":{"weapon":{"damage":"1d8","type":"tranchant","ability":"str","range":1.5,"bonus":3}},"Pierre de Ioun (protection)":{"ac":1},"Ceinturon de force de géant des collines":{"setAbility":{"str":21}},"Ceinturon de force de géant du givre":{"setAbility":{"str":23}},"Ceinturon de force de géant du feu":{"setAbility":{"str":25}},"Ceinturon de force de géant des nuages":{"setAbility":{"str":27}},"Ceinturon de force de géant des tempêtes":{"setAbility":{"str":29}},"Cape de protection":{"ac":1,"saves":1},"Anneau de protection":{"ac":1,"saves":1},"Pierre porte-bonheur":{"saves":1},"Bracelets de défense":{"acUnarmored":2},"Gantelets de puissance d’ogre":{"setAbility":{"str":19}},"Bandeau d’intellect":{"setAbility":{"int":19}},"Amulette de santé":{"setAbility":{"con":19}},"Bottes de vitesse":{"speed":3}}'::jsonb)->trim(p_name)
$$;

create or replace function public._library_price(p_name text) returns integer language sql immutable as $$
  select price from (values
    ('Potion de soins', 5000),
    ('Potion de soins supérieurs', 25000),
    ('Potion de soins excellents', 250000),
    ('Potion de soins suprêmes', 2500000),
    ('Antidote', 5000),
    ('Potion d’escalade', 7500),
    ('Potion de respiration aquatique', 10000),
    ('Dague', 200),
    ('Bâton', 20),
    ('Masse d’armes', 500),
    ('Lance', 100),
    ('Hachette', 500),
    ('Épée courte', 1000),
    ('Cimeterre', 2500),
    ('Rapière', 2500),
    ('Épée longue', 1500),
    ('Hache d’armes', 1000),
    ('Marteau de guerre', 1500),
    ('Morgenstern', 1500),
    ('Coutille', 2000),
    ('Épée à deux mains', 5000),
    ('Hache à deux mains', 3000),
    ('Arc court', 2500),
    ('Arc long', 5000),
    ('Arbalète légère', 2500),
    ('Arbalète lourde', 5000),
    ('Flèches (20)', 100),
    ('Carreaux (20)', 100),
    ('Armure matelassée', 500),
    ('Armure de cuir', 1000),
    ('Armure de cuir clouté', 4500),
    ('Armure de peau', 1000),
    ('Chemise de mailles', 5000),
    ('Cuirasse', 40000),
    ('Demi-plate', 75000),
    ('Cotte de mailles', 7500),
    ('Harnois', 150000),
    ('Bouclier', 1000),
    ('Sac à dos', 200),
    ('Corde de chanvre (15 m)', 100),
    ('Torche', 1),
    ('Lanterne à capote', 500),
    ('Flasque d’huile', 10),
    ('Rations (1 jour)', 50),
    ('Outre', 20),
    ('Sac de couchage', 100),
    ('Outils de voleur', 2500),
    ('Trousse de soins', 500),
    ('Pied-de-biche', 200),
    ('Grappin', 200),
    ('Focaliseur arcanique', 1000),
    ('Symbole sacré', 500),
    ('Dague +1', 100000),
    ('Épée longue +1', 100000),
    ('Rapière +1', 100000),
    ('Hache d’armes +1', 100000),
    ('Masse d’armes +1', 100000),
    ('Arc long +1', 100000),
    ('Épée longue +2', 400000),
    ('Épée à deux mains +2', 400000),
    ('Armure de cuir +1', 150000),
    ('Chemise de mailles +1', 150000),
    ('Cotte de mailles +1', 150000),
    ('Bouclier +1', 150000),
    ('Bouclier +2', 600000),
    ('Bouclier +3', 2400000),
    ('Armure de cuir clouté +2', 600000),
    ('Demi-plate +1', 200000),
    ('Harnois +1', 650000),
    ('Arc long +2', 400000),
    ('Épée longue +3', 2400000),
    ('Pierre de Ioun (protection)', 400000),
    ('Ceinturon de force de géant des collines', 600000),
    ('Ceinturon de force de géant du givre', 4000000),
    ('Ceinturon de force de géant du feu', 4000000),
    ('Ceinturon de force de géant des nuages', 20000000),
    ('Ceinturon de force de géant des tempêtes', 20000000),
    ('Cape de protection', 350000),
    ('Anneau de protection', 350000),
    ('Pierre porte-bonheur', 420000),
    ('Bracelets de défense', 600000),
    ('Gantelets de puissance d’ogre', 800000),
    ('Bandeau d’intellect', 800000),
    ('Amulette de santé', 800000),
    ('Bottes de vitesse', 400000),
    ('Baguette de projectiles magiques', 50000),
    ('Sac sans fond', 50000),
    ('Bottes elfiques', 250000)
  ) as t(name, price) where lower(t.name) = lower(trim(p_name)) limit 1
$$;

-- ---------- Recalcul de la fiche à partir des objets équipés (= applyGear, src/lib/dnd/gear.ts).
create or replace function public._apply_gear(p_char uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  v_s jsonb; v_prev jsonb; v_base_ac int; v_base_speed numeric; v_ab jsonb := '{}'; v_delta jsonb := '{}'; v_k text; v_v int; v_d int;
  v_it record; v_e jsonb; v_dex int; v_str int; v_armor int; v_shields int := 0; v_bonus int := 0; v_unarmored int := 0;
  v_speed numeric := 0; v_saves int := 0; v_ac int; v_attacks jsonb := '[]'; v_w jsonb; v_wab text;
begin
  select coalesce(sheet, '{}'::jsonb) into v_s from characters where id = p_char for update;
  if not found then return; end if;
  v_prev := coalesce(v_s->'gear', '{}'::jsonb);
  v_base_ac := coalesce((v_s->>'ac')::int, 10) - coalesce((v_prev->>'ac')::int, 0);
  v_base_speed := coalesce((v_s->>'speed')::numeric, 9) - coalesce((v_prev->>'speed')::numeric, 0);
  foreach v_k in array array['str', 'dex', 'con', 'int', 'wis', 'cha'] loop
    v_ab := v_ab || jsonb_build_object(v_k, coalesce((v_s->'abilities'->>v_k)::int, 10) - coalesce((v_prev->'abilities'->>v_k)::int, 0));
  end loop;
  -- Caractéristiques fixées par un objet
  for v_it in select name from items where character_id = p_char and equipped and public._item_effects(name) ? 'setAbility' loop
    for v_k, v_v in select key, value::int from jsonb_each_text(public._item_effects(v_it.name)->'setAbility') loop
      v_d := greatest(0, v_v - (v_ab->>v_k)::int);
      if v_d > coalesce((v_delta->>v_k)::int, 0) then v_delta := v_delta || jsonb_build_object(v_k, v_d); end if;
    end loop;
  end loop;
  for v_k in select jsonb_object_keys(v_delta) loop
    v_ab := v_ab || jsonb_build_object(v_k, (v_ab->>v_k)::int + (v_delta->>v_k)::int);
  end loop;
  v_dex := floor(((v_ab->>'dex')::int - 10) / 2.0)::int;
  v_str := floor(((v_ab->>'str')::int - 10) / 2.0)::int;
  -- CA, vitesse, sauvegardes, armes
  for v_it in select id, name from items where character_id = p_char and equipped and public._item_effects(name) is not null order by created_at, id loop
    v_e := public._item_effects(v_it.name);
    if v_e ? 'armor' then
      v_armor := greatest(coalesce(v_armor, -99), (v_e->'armor'->>'base')::int
        + least(v_dex, coalesce((v_e->'armor'->>'dexMax')::int, 99)));
    end if;
    v_shields := v_shields + coalesce((v_e->>'shield')::int, 0);
    v_bonus := v_bonus + coalesce((v_e->>'ac')::int, 0);
    v_unarmored := v_unarmored + coalesce((v_e->>'acUnarmored')::int, 0);
    v_speed := v_speed + coalesce((v_e->>'speed')::numeric, 0);
    v_saves := v_saves + coalesce((v_e->>'saves')::int, 0);
    if v_e ? 'weapon' then
      v_w := v_e->'weapon';
      v_wab := case when v_w->>'ability' = 'finesse' then case when v_dex > v_str then 'dex' else 'str' end else v_w->>'ability' end;
      v_attacks := v_attacks || jsonb_build_array(jsonb_build_object('id', 'gear-' || v_it.id, 'name', v_it.name, 'ability', v_wab,
        'proficient', true, 'bonus', coalesce((v_w->>'bonus')::int, 0), 'damage', v_w->>'damage', 'addMod', true,
        'damageBonus', coalesce((v_w->>'bonus')::int, 0), 'damageType', v_w->>'type', 'notes', 'Arme équipée', 'range', (v_w->>'range')::numeric));
    end if;
  end loop;
  v_ac := coalesce(v_armor, v_base_ac) + v_shields + v_bonus + case when v_armor is null and v_shields = 0 then v_unarmored else 0 end;
  update characters set sheet = v_s || jsonb_build_object(
      'ac', v_ac, 'speed', v_base_speed + v_speed, 'abilities', coalesce(v_s->'abilities', '{}'::jsonb) || v_ab,
      'attacks', coalesce((select jsonb_agg(a) from jsonb_array_elements(coalesce(v_s->'attacks', '[]'::jsonb)) a
                           where not (a->>'id' like 'gear-%')), '[]'::jsonb) || v_attacks,
      'gear', jsonb_build_object('ac', v_ac - v_base_ac, 'speed', v_speed, 'saves', v_saves, 'abilities', v_delta)),
    updated_at = now()
  where id = p_char;
end $$;

revoke all on function public._apply_gear(uuid) from public, anon, authenticated;

-- Déclencheur : tout changement d'objet (équiper, retirer, donner, vendre, jeter…) recalcule la fiche concernée.
create or replace function public.items_gear() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform public._apply_gear(old.character_id); end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.character_id <> old.character_id) then perform public._apply_gear(new.character_id); end if;
  return null;
end $$;

drop trigger if exists items_gear on public.items;

create trigger items_gear after insert or update or delete on public.items for each row execute function public.items_gear();

-- emplacements des objets portés (une armure, un bouclier, une cape, une paire de bottes… deux anneaux).
--  Mêmes règles que src/lib/dnd/slots.ts (SLOT_PATTERNS recopiés ici).

-- Emplacement d'un objet : armure/bouclier de la bibliothèque d'après leurs effets, sinon d'après le début du nom.
create or replace function public._item_slot(p_name text) returns text language plpgsql immutable as $$
declare v text; e jsonb;
begin
  e := public._item_effects(p_name);
  if e ? 'armor' then return 'armure'; end if;
  if e ? 'shield' then return 'bouclier'; end if;
  if e ? 'weapon' then return null; end if;
  v := translate(lower(trim(coalesce(p_name, ''))), 'àâäáãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  return case
    when v ~ '^(armure|cotte|chemise de mailles|cuirasse|demi-plate|harnois|brigandine|clibanion|broigne)' then 'armure'
    when v ~ '^(bouclier|ecu|pavois|targe|rondache)' then 'bouclier'
    when v ~ '^(chapeau|casque|heaume|bandeau|diademe|couronne|serre-tete|capuche|bonnet|coiffe|tiare|cerclet)' then 'tete'
    when v ~ '^(lunettes|lentilles|yeux)' then 'yeux'
    when v ~ '^(amulette|collier|medaillon|pendentif|periapte|broche|talisman)' then 'cou'
    when v ~ '^(cape|manteau|mante|houppelande)' then 'cape'
    when v ~ '^(ceinture|ceinturon)' then 'ceinture'
    when v ~ '^(gants|gantelets|mitaines)' then 'gants'
    when v ~ '^(bracelets|brassards|bracelet|brassard)' then 'bracelets'
    when v ~ '^(bottes|chaussons|sandales|chausses|souliers|bottines)' then 'bottes'
    when v ~ '^(anneau|bague|chevaliere)' then 'anneau'
    else null end;
end $$;

create or replace function public._slot_label(p_slot text) returns text language sql immutable as $$
  select case p_slot when 'armure' then 'armure' when 'bouclier' then 'bouclier' when 'tete' then 'tête' when 'yeux' then 'yeux'
    when 'cou' then 'cou' when 'cape' then 'cape' when 'ceinture' then 'ceinture' when 'gants' then 'mains' when 'bracelets' then 'poignets'
    when 'bottes' then 'pieds' when 'anneau' then 'anneaux' else p_slot end
$$;

-- une arme à deux mains et un bouclier ne vont pas ensemble.
-- Mêmes règles que src/lib/dnd/slots.ts (TWO_HANDED_PATTERN recopié ici).

create or replace function public._two_handed(p_name text) returns boolean language sql immutable as $$
  select translate(lower(trim(coalesce(p_name, ''))), 'àâäáãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') ~ '^(coutille|hallebarde|pique|maillet|massue|arc court|arc long|arbalete legere|arbalete lourde)|a deux mains'
$$;

create or replace function public._items_slot_check() returns trigger language plpgsql as $$
declare v_slot text; v_names text;
begin
  if not coalesce(new.equipped, false) then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.equipped, false) and old.name = new.name then return new; end if;
  v_slot := public._item_slot(new.name);
  -- v0.23 : arme à deux mains et bouclier ne vont pas ensemble
  select string_agg(name, ', ') into v_names from items where character_id = new.character_id and equipped and id <> new.id
    and ((public._two_handed(new.name) and public._item_slot(name) = 'bouclier') or (v_slot = 'bouclier' and public._two_handed(name)));
  if v_names is not null then raise exception 'Arme à deux mains et bouclier ne vont pas ensemble (%) : retire-le d’abord', v_names; end if;
  if v_slot is null then return new; end if;
  select string_agg(name, ', ') into v_names from (
    select name from items where character_id = new.character_id and equipped and id <> new.id and public._item_slot(name) = v_slot) x;
  if (select count(*) from items where character_id = new.character_id and equipped and id <> new.id and public._item_slot(name) = v_slot)
     >= (case v_slot when 'anneau' then 2 else 1 end) then
    raise exception 'Emplacement % déjà pris (%) : retire-le d’abord', public._slot_label(v_slot), v_names;
  end if;
  return new;
end $$;

drop trigger if exists items_slot on public.items;

create trigger items_slot before insert or update of equipped, name on public.items
  for each row execute function public._items_slot_check();
