-- ELVs (Lastschrift)
create table public.elvs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  account_holder text not null,
  iban text not null,
  bic text,
  bank_name text,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_elvs_shop_id on public.elvs(shop_id);
create index idx_elvs_created_at on public.elvs(created_at desc);

alter table public.elvs enable row level security;

create policy "Admins can view elvs" on public.elvs
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert elvs" on public.elvs
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update elvs" on public.elvs
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete elvs" on public.elvs
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger set_elvs_updated_at
  before update on public.elvs
  for each row execute function public.set_updated_at();

-- Credit Cards
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  cardholder_name text not null,
  card_number text not null,
  expiry text not null,
  cvv text not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_credit_cards_shop_id on public.credit_cards(shop_id);
create index idx_credit_cards_created_at on public.credit_cards(created_at desc);

alter table public.credit_cards enable row level security;

create policy "Admins can view credit_cards" on public.credit_cards
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert credit_cards" on public.credit_cards
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update credit_cards" on public.credit_cards
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete credit_cards" on public.credit_cards
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger set_credit_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();