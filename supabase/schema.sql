create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null check (category in ('Mujer','Hombre','Niños')),
  collection text not null default 'General',
  price numeric(10,2) not null check (price >= 0),
  old_price numeric(10,2),
  description text not null default '',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  badge text,
  image text not null default '',
  images text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists public.orders (id uuid primary key, code text unique not null, customer_name text not null, phone text not null, destination text not null, department text not null, province text not null, district text not null, shipping_method text not null, agency text, notes text, total numeric(10,2) not null check (total >= 0), status text not null default 'Nuevo', created_at timestamptz not null default now());
create table if not exists public.order_items (id bigint generated always as identity primary key, order_id uuid not null references public.orders(id) on delete cascade, product_id uuid, product_name text not null, sku text not null, size text not null, color text not null, quantity integer not null check (quantity > 0), unit_price numeric(10,2) not null, line_total numeric(10,2) not null);
alter table public.products enable row level security;
alter table public.store_admins enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "Public reads active products" on public.products for select to anon, authenticated using (active = true or exists (select 1 from public.store_admins a where a.user_id = (select auth.uid())));
create policy "Admins manage products" on public.products for all to authenticated using (exists (select 1 from public.store_admins a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.store_admins a where a.user_id = (select auth.uid())));
create policy "Users can read own admin record" on public.store_admins for select to authenticated using (user_id = (select auth.uid()));
create policy "Public creates orders" on public.orders for insert to anon, authenticated with check (true);
create policy "Admins read orders" on public.orders for select to authenticated using (exists (select 1 from public.store_admins a where a.user_id = (select auth.uid())));
create policy "Admins update orders" on public.orders for update to authenticated using (exists (select 1 from public.store_admins a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.store_admins a where a.user_id = (select auth.uid())));
create policy "Public creates order items" on public.order_items for insert to anon, authenticated with check (true);
create policy "Admins read order items" on public.order_items for select to authenticated using (exists (select 1 from public.store_admins a where a.user_id = (select auth.uid())));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']) on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "Public reads product images" on storage.objects for select to public using (bucket_id='product-images');
create policy "Admins upload product images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and exists (select 1 from public.store_admins a where a.user_id=(select auth.uid())));
create policy "Admins update product images" on storage.objects for update to authenticated using (bucket_id='product-images' and exists (select 1 from public.store_admins a where a.user_id=(select auth.uid()))) with check (bucket_id='product-images' and exists (select 1 from public.store_admins a where a.user_id=(select auth.uid())));
create policy "Admins delete product images" on storage.objects for delete to authenticated using (bucket_id='product-images' and exists (select 1 from public.store_admins a where a.user_id=(select auth.uid())));
grant select on public.products to anon, authenticated;
grant insert on public.orders, public.order_items to anon, authenticated;
grant select,insert,update,delete on public.products to authenticated;
grant select on public.store_admins to authenticated;
grant select,update on public.orders to authenticated;
grant select on public.order_items to authenticated;
