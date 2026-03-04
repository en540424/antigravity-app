-- 売上確定テーブル
-- 実行先: Supabase SQL Editor
create table if not exists sales_orders (
  id               uuid primary key default gen_random_uuid(),
  ebay_order_id    text not null,
  ebay_item_id     text not null,
  sku              text not null,
  quantity         int not null,
  sale_price       numeric not null,
  ebay_fee         numeric,
  payment_fee      numeric,
  shipping_cost    numeric,
  net_profit       numeric,
  order_created_at timestamptz,
  shipped_at       timestamptz,
  created_at       timestamptz default now()
);

create index if not exists sales_orders_order_idx on sales_orders (ebay_order_id);
create index if not exists sales_orders_sku_idx   on sales_orders (sku);
