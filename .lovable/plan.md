

## Ziel
3 öffentliche Supabase Edge Functions verbinden Shop-Frontend ↔ Backend ↔ Checkout-System. Keine Auth, keine Secrets, keine Ablaufzeit. Produktnamen werden als reine Strings (z. B. `"1.500 Liter Heizöl"`) übertragen.

## Flow

```text
┌──────────────┐  1. POST create-checkout-session    ┌─────────┐
│ Shop-Frontend│ ────────────────────────────────────▶│ Backend │
│              │   {brandingId, products[], shipping}│  (Edge) │
│              │ ◀───────────────────────────────────  │         │
│              │   {checkout_token}                    │         │
└──────┬───────┘                                       └─────────┘
       │ 2. Redirect → Checkout?token=…                    ▲
       ▼                                                   │
┌──────────────┐  3. GET get-checkout-session?token=…      │
│   Checkout   │ ──────────────────────────────────────────┤
│              │   {branding{company_name,logo_url,        │
│              │    vat_rate}, products, shipping, total} │
│              │                                          │
│              │  4. POST submit-order                    │
│              │   {token, customer, billing, shipping?,  │
│              │    payment_method, payment_data}         │
│              │ ─────────────────────────────────────────┘
└──────────────┘   → orders + order_items
                   → elvs ODER credit_cards
                   ◀ {success, order_number}
```

## DB-Migration: neue Tabelle `checkout_sessions`

| Spalte | Typ | Notes |
|---|---|---|
| `id` (PK) | uuid default `gen_random_uuid()` | = Token |
| `shop_id` | uuid | branding source |
| `products` | jsonb | `[{name: string, gross_price: number, quantity: number}]` — `name` ist immer ein **String** wie `"1.500 Liter Heizöl"` |
| `shipping_cost` | numeric default 0 | |
| `total_amount` | numeric | server-berechnet |
| `consumed` | boolean default false | true nach erfolgreicher Bestellung |
| `created_at` | timestamptz default `now()` | **kein** `expires_at` — Sessions laufen nie ab |

**RLS**: aktiviert, **keine Policies** → Frontend/Checkout greifen nie direkt zu, nur via Edge Functions (Service-Role).

## 3 Edge Functions (alle `verify_jwt = false` → vollständig öffentlich)

### 1. `create-checkout-session` (POST)
**Caller:** Shop-Frontend
**Body:**
```json
{
  "brandingId": "uuid",
  "products": [
    { "name": "1.500 Liter Heizöl", "gross_price": 1899.00, "quantity": 1 }
  ],
  "shipping_cost": 49.90
}
```
**Validierung (Zod):**
- `brandingId`: uuid
- `products`: array(min 1), jedes Item mit `name: string(min 1, max 500)`, `gross_price: number(≥0)`, `quantity: integer(≥1)`
- `shipping_cost`: number(≥0)

**Logik:**
- Shop existiert? → 404
- `total = Σ(gross_price * quantity) + shipping_cost`
- Insert in `checkout_sessions` (kein expires_at)
- Returns `{ checkout_token: "<uuid>" }`

### 2. `get-checkout-session` (GET, `?token=…`)
**Caller:** Checkout-System
**Logik:**
- Session laden, prüfen `consumed = false` (kein Ablaufcheck)
- Shop laden
- Returns:
```json
{
  "branding": {
    "company_name": "ACME GmbH",
    "logo_url": "https://…",
    "vat_rate": 0.19
  },
  "products": [
    { "name": "1.500 Liter Heizöl", "gross_price": 1899.00, "quantity": 1 }
  ],
  "shipping_cost": 49.90,
  "total_amount": 1948.90,
  "currency": "EUR"
}
```
**Branding-Regeln (strikt):** nur `company_name`, `logo_url`, `vat_rate`. **Kein** `shop_name`, **kein** `accent_color`. `vat_rate` als Dezimal: DB-Wert `19` → Response `0.19` (geteilt durch 100). Produktnamen werden 1:1 als String durchgereicht.

### 3. `submit-order` (POST)
**Caller:** Checkout-System
**Body:**
```json
{
  "checkout_token": "uuid",
  "customer": {
    "email": "…", "company": "…?", "first_name": "…",
    "last_name": "…", "phone": "…"
  },
  "billing":  { "street": "…", "postal_code": "…", "city": "…" },
  "shipping": {
    "company": "…?", "first_name": "…", "last_name": "…",
    "street": "…", "postal_code": "…", "city": "…"
  } ,
  "payment_method": "sepa" | "card",
  "payment_data": {
    "sepa": { "account_holder": "…", "iban": "…" },
    "card": { "cardholder_name": "…", "card_number": "…", "expiry": "12/27", "cvv": "…" }
  }
}
```
(Je nach `payment_method` ist nur einer der beiden `payment_data`-Zweige nötig.)

**Logik (Reihenfolge):**
1. Session laden + `consumed = false` prüfen
2. `orders` insert (`shop_id`, customer/billing/shipping, `total_amount = session.total_amount`, `payment_method`, `status = "new"`)
3. `order_items` insert: pro Produkt aus `session.products` → `product_name = product.name` (1:1 String, kein JSON-Stringify), `unit_price = gross_price`, `quantity`, `line_total = gross_price * quantity`
4. Wenn `payment_method = "sepa"` → `elvs` insert (`account_holder`, `iban`, `amount = total`, `shop_id`)
5. Wenn `payment_method = "card"` → `credit_cards` insert (`cardholder_name`, `card_number`, `expiry`, `cvv`, `amount = total`, `shop_id`)
6. Session als `consumed = true` markieren
7. Returns `{ success: true, order_number: "…" }`

**Validierung (Zod):** Pflichtfelder, Längen, Email-Format, IBAN-Pattern, Expiry `MM/YY`, CVV 3–4 Ziffern.

## CORS
Alle 3 Functions:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```
Plus `OPTIONS`-Preflight-Handler.

## Sicherheit ohne Secrets
- Token = UUIDv4 (nicht erratbar)
- Single-use via `consumed`-Flag
- Server berechnet `total_amount` neu — Client kann Preise nicht manipulieren
- RLS auf `checkout_sessions` ohne Policies → nur Edge Functions (Service-Role) haben Zugriff
- Kein Ablauf — Sessions bleiben gültig bis sie verbraucht werden

## Admin-Ansichten (keine Änderung)
- `/admin/orders` — neue Bestellungen erscheinen automatisch
- `/admin/elvs` — neue SEPA-Daten erscheinen automatisch
- `/admin/kreditkarten` — neue Kreditkarten erscheinen automatisch

## Dateien
- `supabase/migrations/<ts>_checkout_sessions.sql`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/get-checkout-session/index.ts`
- `supabase/functions/submit-order/index.ts`
- `supabase/config.toml` — 3× `[functions.<name>] verify_jwt = false`

## Public Endpoints (nach Deploy)
```
POST  https://jpielhyfzzznicvcanci.supabase.co/functions/v1/create-checkout-session
GET   https://jpielhyfzzznicvcanci.supabase.co/functions/v1/get-checkout-session?token=…
POST  https://jpielhyfzzznicvcanci.supabase.co/functions/v1/submit-order
```

## Nicht enthalten
- Echte Zahlungsabwicklung
- Email-Versand / PDF-Generierung
- Webhook-Signaturen (bewusst public)

## Ergebnis
Shop sendet Bestelldaten → bekommt Token → leitet User ans Checkout. Checkout lädt Branding (`company_name`, `logo_url`, `vat_rate` als Dezimal) + Produkte (Name als String) + Beträge. Kunde füllt aus → `submit-order` schreibt alles in `orders`/`order_items` + (je nach Zahlart) `elvs` oder `credit_cards`. Sessions laufen nie ab, sind aber single-use.

