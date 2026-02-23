-- Ensure idempotency keys are unique in inventory_ledger (while allowing NULLs)
create unique index if not exists idx_inventory_ledger_idempotency_key
  on inventory_ledger (idempotency_key)
  where idempotency_key is not null;
