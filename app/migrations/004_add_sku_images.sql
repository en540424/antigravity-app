-- sku_images テーブル（分類の正＝DB）
create table if not exists public.sku_images (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  bucket text not null default 'product-images',
  storage_path text not null,              -- 例: "NEX-20251224-A004/RAW/xxxx.jpg"
  public_url text,                         -- 例: supabase public url
  image_type text not null check (image_type in ('RAW','ORIGINAL','LISTING')),
  sort_order int not null default 0,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sku, storage_path)               -- 重複取り込み防止
);

create index if not exists idx_sku_images_sku on public.sku_images (sku);
create index if not exists idx_sku_images_sku_type on public.sku_images (sku, image_type);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sku_images_updated_at on public.sku_images;
create trigger trg_sku_images_updated_at
before update on public.sku_images
for each row execute function public.set_updated_at();

-- RLSはあとで設定（まず動かす）
