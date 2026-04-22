

## Ziel
4 fehlende Spalten in `orders` ergänzen, `submit-order` schreibt sie mit, neue Edge Function `get-order-confirmation` liest die komplette Bestellung für die Confirmation-Page.

## 1. DB-Migration
```sql
ALTER TABLE public.orders
  ADD COLUMN customer_company    text NULL,
  ADD COLUMN shipping_company    text NULL,
  ADD COLUMN shipping_first_name text NULL,
  ADD COLUMN shipping_last_name  text NULL;
```

## 2. `submit-order` erweitern
Request-Schema bleibt unverändert (Checkout sendet diese Felder bereits). Beim `orders`-Insert zusätzlich:
- `customer_company` ← `body.customer.company ?? null`
- `shipping_company` ← `body.shipping?.company ?? null`
- `shipping_first_name` ← `body.shipping?.first_name ?? null`
- `shipping_last_name` ← `body.shipping?.last_name ?? null`

## 3. Neue Edge Function `get-order-confirmation`

**Endpoint:** `GET https://jpielhyfzzznicvcanci.supabase.co/functions/v1/get-order-confirmation?order_number=1234567`

- Public, kein JWT (`supabase/config.toml` → `[functions.get-order-confirmation] verify_jwt = false`)
- CORS offen
- Validierung: `order_number` = 7-stellige Ziffernfolge

**Datenquellen:**
1. `orders` (per `order_number`) → Kunde, Adressen, Zahlart, `shop_id`, `total_amount`, `currency`
2. `order_items` (per `order_id`) → Produktliste
3. `shops` (per `shop_id`) → `company_name`, `logo_url`, `vat_rate`, `app_download_url`
4. `elvs` / `credit_cards` (per `shop_id` + Halter-Name + jüngster `created_at`) → maskierte Zahldaten

**Maskierung:**
- SEPA: `iban_last4` (letzte 4), `iban_country` (erste 2)
- Card: `last4` (letzte 4 Ziffern), `brand` (4=Visa · 5=Mastercard · 3=Amex · 6=Discover · sonst Unknown), `expiry` unverändert

**Berechnungen:**
- `shipping_cost` = `total_amount − sum(line_totals)` (rückgerechnet)
- `vat_rate` = `shop.vat_rate / 100` (z. B. `19 → 0.19`)

**Response (200):**
```json
{
  "order_number": "1234567",
  "app_download_url": "https://…|null",
  "customer": { "email", "first_name", "last_name", "company", "phone" },
  "billing":  { "street", "postal_code", "city" },
  "shipping": { "company", "first_name", "last_name", "street", "postal_code", "city" } | null,
  "payment": {
    "method": "sepa|card",
    "sepa":   { "account_holder", "iban_last4", "iban_country" },
    "card":   { "cardholder", "brand", "last4", "expiry" }
  },
  "session": {
    "branding":      { "company_name", "logo_url", "vat_rate" },
    "products":      [{ "name", "gross_price", "quantity" }],
    "shipping_cost": 0,
    "total_amount":  0,
    "currency":      "EUR"
  }
}
```

`payment.sepa` ODER `payment.card` ist gesetzt — niemals beide.

**Fehler:** `400` invalid order_number · `404` not found · `405` method not allowed · `500` internal

## Geänderte / neue Dateien
1. `supabase/migrations/<timestamp>_add_order_company_shipping_name.sql` (neu)
2. `supabase/functions/submit-order/index.ts` (4 Felder beim Insert ergänzt)
3. `supabase/functions/get-order-confirmation/index.ts` (neu)
4. `supabase/config.toml` (`verify_jwt = false` für neue Function)

## Nach Deploy: Copy-&-Paste-Doku fürs Checkout-System

```ts
const res = await fetch(
  `https://jpielhyfzzznicvcanci.supabase.co/functions/v1/get-order-confirmation?order_number=${orderNumber}`
);
const data = await res.json();
```

Keine Auth-Header. Response-Shape exakt wie oben.

