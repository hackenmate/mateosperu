create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.products(
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null check(category in('Mujer','Hombre','Niños')),
  collection text not null default 'General',
  price numeric(10,2) not null check(price>=0),
  old_price numeric(10,2),
  description text not null default '',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock integer not null default 0 check(stock>=0),
  badge text,
  image text not null default '',
  images text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_admins(
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  document_number text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Casa',
  department text not null,
  province text not null,
  district text not null,
  address_line text not null,
  reference text,
  recipient_name text,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites(
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,product_id)
);

create table if not exists public.coupons(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check(discount_type in('percent','fixed')),
  discount_value numeric(10,2) not null check(discount_value>0),
  min_purchase numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  usage_limit integer,
  used_count integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default(now()+interval '1 year'),
  created_at timestamptz not null default now()
);

create table if not exists public.orders(
  id uuid primary key,
  code text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  email text,
  phone text not null,
  destination text not null,
  department text not null,
  province text not null,
  district text not null,
  shipping_method text not null,
  agency text,
  notes text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null check(total>=0),
  coupon_id uuid references public.coupons(id) on delete set null,
  status text not null default 'Nuevo' check(status in('Nuevo','Confirmado','En preparación','Enviado','Entregado','Cancelado')),
  payment_method text not null default 'Pendiente',
  payment_status text not null default 'Pendiente' check(payment_status in('Pendiente','Pagado','Rechazado','Cancelado','Reembolsado')),
  payment_provider text,
  payment_id text,
  checkout_token uuid not null default gen_random_uuid(),
  stock_committed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items(
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  size text not null,
  color text not null,
  quantity integer not null check(quantity>0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

alter table public.products enable row level security;
alter table public.store_admins enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public reads active products" on public.products;
create policy "Public reads active products" on public.products for select to anon,authenticated using(active=true or exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));

drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products" on public.products for insert to authenticated with check(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins update products" on public.products;
create policy "Admins update products" on public.products for update to authenticated using(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid()))) with check(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products" on public.products for delete to authenticated using(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));

drop policy if exists "Read own admin record" on public.store_admins;
create policy "Read own admin record" on public.store_admins for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites" on public.favorites for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid()))) with check(exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and(o.user_id=(select auth.uid()) or exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())))));

grant select on public.products to anon,authenticated;
grant select,insert,update on public.profiles,public.addresses,public.favorites to authenticated;
grant delete on public.addresses,public.favorites to authenticated;
grant select on public.store_admins,public.orders,public.order_items to authenticated;
grant select,insert,update,delete on public.products to authenticated;
grant update on public.orders to authenticated;

create index if not exists idx_addresses_user_id on public.addresses(user_id);
create index if not exists idx_favorites_product_id on public.favorites(product_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_orders_coupon_id on public.orders(coupon_id);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_products_active_sort on public.products(active,sort_order);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public reads product images" on storage.objects;
create policy "Public reads product images" on storage.objects for select to public using(bucket_id='product-images');
drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images" on storage.objects for update to authenticated using(bucket_id='product-images' and exists(select 1 from public.store_admins a where a.user_id=(select auth.uid()))) with check(bucket_id='product-images' and exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));
drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and exists(select 1 from public.store_admins a where a.user_id=(select auth.uid())));

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
begin
  insert into public.profiles(user_id,full_name,phone)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict(user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

create or replace function public.commit_paid_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security invoker
set search_path=public
as $$
declare
  already_committed boolean;
  item record;
begin
  select stock_committed into already_committed from public.orders where id=p_order_id for update;
  if already_committed is null then return false; end if;
  if already_committed then return true; end if;
  if not exists(select 1 from public.orders where id=p_order_id and payment_status='Pagado') then return false; end if;
  for item in select product_id,quantity from public.order_items where order_id=p_order_id and product_id is not null loop
    update public.products set stock=greatest(0,stock-item.quantity),updated_at=now() where id=item.product_id;
  end loop;
  update public.orders set stock_committed=true,updated_at=now() where id=p_order_id;
  return true;
end;
$$;
revoke all on function public.commit_paid_order_stock(uuid) from public,anon,authenticated;
grant execute on function public.commit_paid_order_stock(uuid) to service_role;
