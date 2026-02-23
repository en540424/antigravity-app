-- 在庫管理関数群

-- 1. 在庫台帳に1行追加する汎用関数
create or replace function add_inventory_tx(
  p_sku text,
  p_tx_type inv_tx_type,
  p_reason inv_reason,
  p_quantity int,
  p_idempotency_key text,
  p_note text default null,
  p_order_id text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_idem text;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be > 0';
  end if;

  v_idem := trim(p_idempotency_key);
  if v_idem is null or length(v_idem) = 0 then
    raise exception 'idempotency_key is required';
  end if;

  -- 二重実行はユニーク制約で防ぐ（同じkeyなら2回目はエラー）
  insert into inventory_ledger (sku, tx_type, reason, quantity, idempotency_key, note, order_id)
  values (p_sku, p_tx_type, p_reason, p_quantity, v_idem, p_note, p_order_id)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    -- 同じ操作が再送された場合は、すでに登録済みとして扱う
    -- 既存IDを返す
    select id into v_id
      from inventory_ledger
         where idempotency_key = v_idem
     limit 1;

    return v_id;
end;
$$;

-- 2. 予約時に在庫不足を防ぐ安全関数
create or replace function reserve_inventory(
  p_sku text,
  p_quantity int,
  p_idempotency_key text,
  p_note text default null,
  p_order_id text default null
)
returns uuid
language plpgsql
as $$
declare
  v_on_hand int;
  v_reserved int;
  v_available int;
  v_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be > 0';
  end if;

  -- SKU単位でロック（同時予約を直列化）
  perform pg_advisory_xact_lock(hashtext(p_sku));

  select
    coalesce(on_hand, 0),
    coalesce(reserved, 0)
  into v_on_hand, v_reserved
  from inventory_balance
  where sku = p_sku;

  v_available := v_on_hand - v_reserved;

  if v_available < p_quantity then
    raise exception 'insufficient stock: available=%, requested=%', v_available, p_quantity;
  end if;

  v_id := add_inventory_tx(p_sku, 'RESERVE', 'SALE', p_quantity, p_idempotency_key, p_note, p_order_id);
  return v_id;
end;
$$;

-- 3. 予約解除関数（オプション）
create or replace function release_inventory(
  p_sku text,
  p_quantity int,
  p_idempotency_key text,
  p_note text default null,
  p_order_id text default null
)
returns uuid
language plpgsql
as $$
declare
  v_reserved int;
  v_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be > 0';
  end if;

  -- SKU単位でロック
  perform pg_advisory_xact_lock(hashtext(p_sku));

  select coalesce(reserved, 0)
  into v_reserved
  from inventory_balance
  where sku = p_sku;

  if v_reserved < p_quantity then
    raise exception 'cannot release more than reserved: reserved=%, requested=%', v_reserved, p_quantity;
  end if;

  v_id := add_inventory_tx(p_sku, 'RELEASE', 'SALE', p_quantity, p_idempotency_key, p_note, p_order_id);
  return v_id;
end;
$$;
