-- Enum
create type public.order_status as enum ('new','processing','shipped','completed','cancelled','refunded');

-- Order number generator
create or replace function public.generate_order_number()
returns text
language plpgsql
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := lpad(floor(random()*9000000 + 1000000)::text, 7, '0');
    exit when not exists (select 1 from public.orders where order_number = candidate);
    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'Could not generate unique order_number';
    end if;
  end loop;
  return candidate;
end;
$$;

-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text,
  billing_street text not null,
  billing_postal_code text not null,
  billing_city text not null,
  billing_country text not null default 'DE',
  shipping_street text,
  shipping_postal_code text,
  shipping_city text,
  shipping_country text,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  payment_method text,
  status public.order_status not null default 'new',
  hidden boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_shop_id on public.orders(shop_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);
create index idx_orders_hidden on public.orders(hidden);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

create policy "Admins can view orders" on public.orders
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert orders" on public.orders
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update orders" on public.orders
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete orders" on public.orders
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_name text not null,
  product_sku text,
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items(order_id);

alter table public.order_items enable row level security;

create policy "Admins can view order items" on public.order_items
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert order items" on public.order_items
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update order items" on public.order_items
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete order items" on public.order_items
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));