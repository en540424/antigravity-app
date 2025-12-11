/**
 * Supabase SQL マイグレーション
 * 
 * sku_list テーブルに以下のカラムを追加して、AI抽出した商品情報を保存
 */

-- テーブル拡張: sku_list に新規カラムを追加
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS ebay_category TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS title_optimized TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS item_specifics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE sku_list ADD COLUMN IF NOT EXISTS ai_extracted_at TIMESTAMP;

-- インデックス追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_sku_list_genre ON sku_list(genre);
CREATE INDEX IF NOT EXISTS idx_sku_list_brand ON sku_list(brand);
CREATE INDEX IF NOT EXISTS idx_sku_list_ebay_category ON sku_list(ebay_category);
