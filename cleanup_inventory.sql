-- ① まず「本当に消していいか」確認
select *
from inventory_ledger
where sku = 'TEST-SKU-1'
order by created_at;

-- ② TEST-SKU-1 を ledger から削除（本番OK）
-- 確認後、コメントを外して実行してください
-- delete from inventory_ledger
-- where sku = 'TEST-SKU-1';

-- ③ 消えたか確認
select * from inventory_balance;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- その他の確認用クエリ
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 在庫台帳の確認（最新200件）
select sku, tx_type, reason, quantity, created_at
from inventory_ledger
order by created_at desc
limit 200;

-- 在庫残高の確認
select * from inventory_balance order by sku;

-- TEST系SKU全体の削除（必要な場合）
-- delete from inventory_ledger
-- where sku like 'TEST-%';
