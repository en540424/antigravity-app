-- 論理削除用カラム追加
ALTER TABLE sku_list ADD COLUMN deleted_at timestamp with time zone;
