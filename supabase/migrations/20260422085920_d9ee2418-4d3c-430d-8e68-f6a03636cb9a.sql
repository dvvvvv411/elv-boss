ALTER TABLE public.orders
  ADD COLUMN customer_company    text NULL,
  ADD COLUMN shipping_company    text NULL,
  ADD COLUMN shipping_first_name text NULL,
  ADD COLUMN shipping_last_name  text NULL;