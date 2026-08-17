alter table public.orders add column if not exists stock_committed boolean not null default false;

create or replace function public.commit_paid_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  item record;
begin
  if not exists (
    select 1 from public.orders
    where id=p_order_id and payment_status='Pagado' and stock_committed=false
    for update
  ) then
    return false;
  end if;

  for item in select product_id,quantity from public.order_items where order_id=p_order_id and product_id is not null loop
    update public.products
    set stock=greatest(0,stock-item.quantity),updated_at=now()
    where id=item.product_id;
  end loop;

  update public.orders set stock_committed=true,updated_at=now() where id=p_order_id;
  return true;
end;
$$;

revoke all on function public.commit_paid_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.commit_paid_order_stock(uuid) to service_role;
