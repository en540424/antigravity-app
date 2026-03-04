-- ① sku_list に戦略フラグ追加
alter table sku_list
  add column if not exists shipping_strategy text not null default 'US_DDP',
  add column if not exists duty_strategy     text not null default 'DDP';

-- ② ポリシーマッピングテーブル（strategy が主キー）
create table if not exists shipping_policy_map (
  strategy               text primary key,
  fulfillment_policy_id  text not null default '',
  payment_policy_id      text not null default '',
  return_policy_id       text not null default '',
  duty_markup_rate       numeric not null default 0,
  shipping_cost_usd      numeric not null default 0,
  free_shipping          boolean not null default false,
  note                   text,
  updated_at             timestamptz default now()
);

-- ③ 初期レコード
-- 実行後: Supabase Table Editor で各行の policy_id を実際の値に更新すること
insert into shipping_policy_map
  (strategy, fulfillment_policy_id, payment_policy_id, return_policy_id,
   duty_markup_rate, shipping_cost_usd, free_shipping, note)
values
  ('US_DDP',            '', '', '', 12, 0,  true,  'EIS + 関税込みDDP（デフォルト）'),
  ('US_BUYER_PAYS',     '', '', '', 0,  35, false, 'EIS + バイヤー送料負担'),
  ('GLOBAL_BUYER_PAYS', '', '', '', 0,  0,  false, 'EIS グローバル バイヤー関税負担'),
  ('EXPRESS_ONLY',      '', '', '', 0,  50, false, 'Express 専用（FedEx等）')
on conflict (strategy) do nothing;
