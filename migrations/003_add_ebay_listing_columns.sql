-- sku_list に eBay直接出品用カラムを追加
-- 実行先: Supabase SQL Editor
alter table sku_list
  add column if not exists ebay_item_id text,
  add column if not exists ebay_listing_status text default 'draft',
  add column if not exists ebay_listing_url text,
  add column if not exists ebay_synced_at timestamptz;

-- ステータス定義（コメント）
-- draft   : 下書き（デフォルト）
-- ready   : 出品可能（全項目揃い済み）
-- active  : eBay出品中
-- ended   : 出品終了
-- sold    : 売却済み
