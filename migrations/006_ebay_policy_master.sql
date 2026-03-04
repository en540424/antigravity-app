-- ① eBay ポリシーマスターテーブル
-- eBay Sell Account API から同期したポリシー情報を保持する
create table if not exists public.ebay_policy_master (
  id              bigserial primary key,
  policy_type     text not null check (policy_type in ('FULFILLMENT', 'PAYMENT', 'RETURN')),
  policy_id       text not null,
  name            text not null,
  description     text,
  is_active       boolean not null default true,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (policy_type, policy_id)
);

create index if not exists idx_ebay_policy_master_type_active
  on public.ebay_policy_master (policy_type, is_active);

-- ② sku_list に SKUごとのポリシー選択カラム
-- NULL の場合は shipping_policy_map（戦略デフォルト）を使う
alter table public.sku_list
  add column if not exists ebay_fulfillment_policy_id text,
  add column if not exists ebay_payment_policy_id     text,
  add column if not exists ebay_return_policy_id      text;
