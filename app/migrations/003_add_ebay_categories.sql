-- 1) eBayカテゴリマスター
create table if not exists public.ebay_categories (
  category_id        bigint primary key,
  parent_id          bigint null references public.ebay_categories(category_id) on delete set null,
  name_en            text not null,
  name_ja            text null,
  path_en            text not null,
  path_ja            text null,
  level              smallint not null default 0,
  leaf               boolean not null default false,
  enabled            boolean not null default true,
  version_tag        text null, -- 取り込みバージョン（任意）
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_ebay_categories_parent on public.ebay_categories(parent_id);
create index if not exists idx_ebay_categories_leaf on public.ebay_categories(leaf);
create index if not exists idx_ebay_categories_enabled on public.ebay_categories(enabled);

-- 検索用（LIKE / ILIKE向け）
create index if not exists idx_ebay_categories_name_en on public.ebay_categories using gin (to_tsvector('simple', coalesce(name_en,'')));
create index if not exists idx_ebay_categories_path_en on public.ebay_categories using gin (to_tsvector('simple', coalesce(path_en,'')));
create index if not exists idx_ebay_categories_name_ja on public.ebay_categories using gin (to_tsvector('simple', coalesce(name_ja,'')));
create index if not exists idx_ebay_categories_path_ja on public.ebay_categories using gin (to_tsvector('simple', coalesce(path_ja,'')));

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ebay_categories_updated_at on public.ebay_categories;
create trigger trg_ebay_categories_updated_at
before update on public.ebay_categories
for each row execute procedure public.set_updated_at();

-- 2) SKU側にカテゴリIDを保持（なければ追加）
alter table public.sku_list
add column if not exists const categoryId = typeof sku.ebay_category_id === "number" ? sku.ebay_category_id : null;

if (!categoryId || categoryId <= 0) {
  missing.push("カテゴリ未設定");
}
_id bigint null references public.ebay_categories(category_id);

alter table public.sku_list
add column if not exists const categoryId = typeof sku.ebay_category_id === "number" ? sku.ebay_category_id : null;

if (!categoryId || categoryId <= 0) {
  missing.push("カテゴリ未設定");
}
_path_snapshot text null;

create index if not exists idx_sku_list_const categoryId = typeof sku.ebay_category_id === "number" ? sku.ebay_category_id : null;

if (!categoryId || categoryId <= 0) {
  missing.push("カテゴリ未設定");
}
_id on public.sku_list(const categoryId = typeof sku.ebay_category_id === "number" ? sku.ebay_category_id : null;

if (!categoryId || categoryId <= 0) {
  missing.push("カテゴリ未設定");
}
_id);
