create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size text not null default 'Única',
  color text not null default 'Único',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,size,color)
);

alter table public.product_variants enable row level security;

create policy "Public reads active variants" on public.product_variants for select to anon, authenticated using (
  active = true and exists(select 1 from public.products p where p.id=product_id and p.active=true)
  or exists(select 1 from public.store_admins a where a.user_id=(select auth.uid()))
);

create policy "Admins manage variants" on public.product_variants for all to authenticated
using(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())))
with check(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_variants_active on public.product_variants(product_id,active);

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
create index if not exists idx_order_items_variant_id on public.order_items(variant_id);

create or replace function public.sync_product_stock_from_variants() returns trigger
language plpgsql
set search_path=public
as $$
begin
  update public.products p
  set stock = coalesce((select sum(v.stock) from public.product_variants v where v.product_id = coalesce(new.product_id, old.product_id) and v.active=true),0),
      sizes = coalesce((select array_agg(distinct v.size order by v.size) from public.product_variants v where v.product_id = coalesce(new.product_id, old.product_id) and v.active=true),'{}'::text[]),
      colors = coalesce((select array_agg(distinct v.color order by v.color) from public.product_variants v where v.product_id = coalesce(new.product_id, old.product_id) and v.active=true),'{}'::text[]),
      updated_at = now()
  where p.id = coalesce(new.product_id, old.product_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_product_stock_from_variants
after insert or update or delete on public.product_variants
for each row execute function public.sync_product_stock_from_variants();
