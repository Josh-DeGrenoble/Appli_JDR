-- 05 : Objets : donner, échanger, utiliser, acheter, vendre, déposer dans un coffre.
-- Base installée en une fois (fichiers 01 à 09 dans l'ordre, ou supabase/installation_complete.sql).
set check_function_bodies = off;

-- Objets : seul le MJ en crée (give_item) ; le joueur peut réduire la quantité, équiper, jeter, donner.
create or replace function public.give_item(p_char uuid, p_name text, p_qty integer, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare v_campaign uuid; v_existing uuid;
begin
  if not public.is_gm_of_char(p_char) then raise exception 'Seul le MJ donne des objets'; end if;
  select campaign_id into v_campaign from characters where id = p_char;
  select id into v_existing from items
    where character_id = p_char and lower(name) = lower(trim(p_name)) and description = coalesce(p_description, '') limit 1;
  if v_existing is not null then
    update items set qty = qty + greatest(1, p_qty) where id = v_existing;
  else
    insert into items (campaign_id, character_id, name, qty, description)
      values (v_campaign, p_char, trim(p_name), greatest(1, p_qty), coalesce(p_description, ''));
  end if;
end $$;

grant execute on function public.give_item(uuid, text, integer, text) to authenticated;

-- transfer_item : le joueur peut donner un objet à un autre perso (fusion autorisée côté destinataire).
create or replace function public.transfer_item(p_item uuid, p_to uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_item items; v_n integer; v_dest uuid;
begin
  select * into v_item from items where id = p_item for update;
  if not found then raise exception 'Objet introuvable'; end if;
  if not public.can_edit_inventory(v_item.character_id) then raise exception 'Accès refusé'; end if;
  if not exists (select 1 from characters where id = p_to and campaign_id = v_item.campaign_id) then
    raise exception 'Destinataire invalide';
  end if;
  perform set_config('grimoire.allow_items', 'on', true);
  v_n := least(greatest(1, p_qty), v_item.qty);
  select id into v_dest from items where character_id = p_to and lower(name) = lower(v_item.name) and description = v_item.description limit 1;
  if v_dest is not null then update items set qty = qty + v_n where id = v_dest;
  else insert into items (campaign_id, character_id, name, qty, description) values (v_item.campaign_id, p_to, v_item.name, v_n, v_item.description);
  end if;
  if v_item.qty - v_n <= 0 then delete from items where id = p_item; else update items set qty = qty - v_n where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);
end $$;

grant execute on function public.transfer_item(uuid, uuid, integer) to authenticated;

-- Objet de soin (potion) : −1 exemplaire et PV rendus au porteur ou à une cible de la campagne.
create or replace function public.use_item(p_item uuid, p_heal integer, p_target uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_item items; v_target uuid;
begin
  select * into v_item from items where id = p_item for update;
  if not found or v_item.qty < 1 then raise exception 'Objet introuvable'; end if;
  if not (public.is_gm_of_char(v_item.character_id)
          or exists (select 1 from characters where id = v_item.character_id and owner_id = auth.uid())) then
    raise exception 'Ce n’est pas ton objet';
  end if;
  v_target := coalesce(p_target, v_item.character_id);
  if not exists (select 1 from characters where id = v_target and campaign_id = v_item.campaign_id) then
    raise exception 'Cible invalide';
  end if;
  perform set_config('grimoire.allow_items', 'on', true);
  if v_item.qty <= 1 then delete from items where id = p_item; else update items set qty = qty - 1 where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);
  perform public._apply_hp_internal(v_target, greatest(0, p_heal));
end $$;

grant execute on function public.use_item(uuid, integer, uuid) to authenticated;

-- Paie p_price (pc) avec une bourse {pp,po,pe,pa,pc} : garde les plus grosses pièces, rend la monnaie en po/pa/pc.
-- = payCoins (src/lib/dnd/shop.ts).
create or replace function public._pay_coins(p_coins jsonb, p_price integer)
returns jsonb language plpgsql immutable as $$
declare
  v_keys text[] := array['pp', 'po', 'pe', 'pa', 'pc'];
  v_vals int[] := array[1000, 100, 50, 10, 1];
  v_total bigint := 0; v_rest bigint; v_out jsonb := '{}'; v_n bigint; v_i int;
begin
  for v_i in 1..5 loop v_total := v_total + coalesce((p_coins->>v_keys[v_i])::bigint, 0) * v_vals[v_i]; end loop;
  if p_price > v_total then raise exception 'Pas assez d’argent'; end if;
  v_rest := v_total - p_price;
  for v_i in 1..5 loop
    v_n := least(coalesce((p_coins->>v_keys[v_i])::bigint, 0), v_rest / v_vals[v_i]);
    v_out := v_out || jsonb_build_object(v_keys[v_i], v_n);
    v_rest := v_rest - v_n * v_vals[v_i];
  end loop;
  for v_i in 2..5 loop
    continue when v_keys[v_i] = 'pe';
    v_n := v_rest / v_vals[v_i];
    v_out := v_out || jsonb_build_object(v_keys[v_i], (v_out->>v_keys[v_i])::bigint + v_n);
    v_rest := v_rest - v_n * v_vals[v_i];
  end loop;
  return v_out;
end $$;

-- Achat (marchand) ou prise (coffre) : vérifie droits, visibilité et stock, paie, retire du stock, ajoute au sac.
create or replace function public.buy_item(p_item uuid, p_character uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_it shop_items; v_shop shops; v_char characters; v_gm boolean; v_coins jsonb; v_same uuid;
begin
  select * into v_it from shop_items where id = p_item for update;
  if not found then raise exception 'Objet introuvable'; end if;
  select * into v_shop from shops where id = v_it.shop_id;
  select * into v_char from characters where id = p_character for update;
  if v_char.id is null or v_char.campaign_id <> v_shop.campaign_id then raise exception 'Objet introuvable'; end if;
  v_gm := public.is_gm(v_shop.campaign_id);
  if not v_gm and v_char.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton personnage'; end if;
  if not v_gm and not v_shop.visible then raise exception 'Ce marchand n’est pas disponible'; end if;
  if p_qty < 1 or p_qty > v_it.qty then raise exception 'Quantité indisponible'; end if;

  if v_shop.kind = 'merchant' then
    v_coins := public._pay_coins(coalesce(v_char.sheet->'coins', '{}'::jsonb), v_it.price_cp * p_qty);
    update characters set sheet = jsonb_set(coalesce(sheet, '{}'::jsonb), '{coins}', v_coins), updated_at = now() where id = p_character;
  end if;

  if v_it.qty - p_qty <= 0 then delete from shop_items where id = p_item;
  else update shop_items set qty = qty - p_qty where id = p_item; end if;

  perform set_config('grimoire.allow_items', 'on', true);
  select id into v_same from items where character_id = p_character and lower(name) = lower(v_it.name) and description = v_it.description limit 1;
  if v_same is not null then update items set qty = qty + p_qty where id = v_same;
  else insert into items (campaign_id, character_id, name, qty, description, heal)
       values (v_it.campaign_id, p_character, v_it.name, p_qty, v_it.description, coalesce(v_it.heal, '')); end if;
  perform set_config('grimoire.allow_items', 'off', true);
end $$;

grant execute on function public.buy_item(uuid, uuid, integer) to authenticated;

-- Vente : moitié de la valeur (prix du marchand pour le même objet, sinon bibliothèque) ; l'objet passe au marchand.
-- = sellItem (src/data/localShopOps.ts), addCoins / resalePrice (src/lib/dnd/shop.ts).
create or replace function public.sell_item(p_item uuid, p_shop uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_it items; v_shop shops; v_char characters; v_gm boolean; v_value int; v_gain bigint; v_coins jsonb; v_same uuid;
begin
  select * into v_it from items where id = p_item for update;
  select * into v_shop from shops where id = p_shop;
  if v_it.id is null or v_shop.id is null or v_shop.kind <> 'merchant' or v_it.campaign_id <> v_shop.campaign_id then
    raise exception 'Vente impossible';
  end if;
  select * into v_char from characters where id = v_it.character_id for update;
  v_gm := public.is_gm(v_shop.campaign_id);
  if not v_gm and v_char.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton objet'; end if;
  if not v_gm and (not v_shop.visible or not v_shop.buys) then raise exception 'Ce marchand n’achète rien'; end if;
  if p_qty < 1 or p_qty > v_it.qty then raise exception 'Quantité indisponible'; end if;
  select price_cp into v_value from shop_items where shop_id = p_shop and lower(name) = lower(v_it.name) limit 1;
  v_value := coalesce(v_value, public._library_price(v_it.name));
  if v_value is null or v_value / 2 < 1 then raise exception 'Le marchand n’achète pas cet objet'; end if;
  v_gain := (v_value / 2)::bigint * p_qty;

  v_coins := coalesce(v_char.sheet->'coins', '{}'::jsonb);
  v_coins := v_coins || jsonb_build_object(
    'po', coalesce((v_coins->>'po')::bigint, 0) + v_gain / 100,
    'pa', coalesce((v_coins->>'pa')::bigint, 0) + (v_gain % 100) / 10,
    'pc', coalesce((v_coins->>'pc')::bigint, 0) + v_gain % 10);
  update characters set sheet = jsonb_set(coalesce(sheet, '{}'::jsonb), '{coins}', v_coins), updated_at = now() where id = v_char.id;

  perform set_config('grimoire.allow_items', 'on', true);
  if v_it.qty - p_qty <= 0 then delete from items where id = p_item; else update items set qty = qty - p_qty where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);

  select id into v_same from shop_items where shop_id = p_shop and lower(name) = lower(v_it.name) limit 1;
  if v_same is not null then update shop_items set qty = qty + p_qty where id = v_same;
  else insert into shop_items (shop_id, campaign_id, name, qty, price_cp, description, heal)
       values (p_shop, v_shop.campaign_id, v_it.name, p_qty, v_value, v_it.description, nullif(v_it.heal, '')); end if;
end $$;

grant execute on function public.sell_item(uuid, uuid, integer) to authenticated;

-- ---------- Dépôt dans un coffre (joueur : coffre visible ; MJ : tout coffre), gratuit.
create or replace function public.deposit_item(p_item uuid, p_shop uuid, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_it items; v_shop shops; v_char characters; v_same uuid;
begin
  select * into v_it from items where id = p_item for update;
  select * into v_shop from shops where id = p_shop;
  select * into v_char from characters where id = v_it.character_id;
  if v_it.id is null or v_shop.id is null or v_shop.kind <> 'chest' or v_char.campaign_id <> v_shop.campaign_id then raise exception 'Dépôt impossible'; end if;
  if not public.is_gm(v_shop.campaign_id) then
    if v_char.owner_id <> auth.uid() then raise exception 'Ce n’est pas ton objet'; end if;
    if not v_shop.visible then raise exception 'Ce coffre n’est pas disponible'; end if;
  end if;
  if p_qty < 1 or p_qty > v_it.qty then raise exception 'Quantité indisponible'; end if;
  perform set_config('grimoire.allow_items', 'on', true);
  if v_it.qty - p_qty <= 0 then delete from items where id = p_item; else update items set qty = qty - p_qty where id = p_item; end if;
  perform set_config('grimoire.allow_items', 'off', true);
  select id into v_same from shop_items where shop_id = p_shop and lower(name) = lower(v_it.name) and description = v_it.description limit 1;
  if v_same is not null then update shop_items set qty = qty + p_qty where id = v_same;
  else insert into shop_items (shop_id, campaign_id, name, qty, price_cp, description, heal)
       values (p_shop, v_shop.campaign_id, v_it.name, p_qty, coalesce(public._library_price(v_it.name), 0), v_it.description, v_it.heal);
  end if;
end $$;

grant execute on function public.deposit_item(uuid, uuid, integer) to authenticated;
