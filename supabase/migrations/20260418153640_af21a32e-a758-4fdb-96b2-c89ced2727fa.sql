-- shops table
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  shop_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  address text,
  city text,
  postal_code text,
  country text NOT NULL DEFAULT 'DE',
  currency text NOT NULL DEFAULT 'EUR',
  language text NOT NULL DEFAULT 'de',
  vat_id text,
  business_owner text,
  court text,
  commercial_register_number text,
  vat_rate numeric NOT NULL DEFAULT 19,
  resend_api_key text,
  sender_email text,
  sender_name text,
  sms_sender_name text,
  logo_url text,
  accent_color text NOT NULL DEFAULT '#2ed573',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shops"
ON public.shops FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert shops"
ON public.shops FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

CREATE POLICY "Admins can update shops"
ON public.shops FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shops"
ON public.shops FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shops_set_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view shop logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-logos');

CREATE POLICY "Admins can upload shop logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shop logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shop logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shop-logos' AND public.has_role(auth.uid(), 'admin'));