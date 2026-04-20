

## Ziel
Drei öffentliche HTTP-Endpunkte als TanStack Server Routes bereitstellen, damit **Shop-Frontend** und **Checkout-System** mit dem Backend kommunizieren können — **ohne neue Secrets**.

## Flow

```text
[Shop-Frontend]  (bereits gebrandet)
   │  1. POST /api/checkout/init  { branding_id, products, shipping_cost }
   │     → erhält checkout_token
   │
   │  2. Redirect zum Checkout-System mit checkout_token
   ▼
[Checkout-System]
   │  3. GET /api/checkout/session/{token}
   │     → erhält Branding (company_name, logo_url, vat_rate, currency)
   │       + Produkte + shipping_cost + total
   │
   │  4. Kunde füllt Formular + Zahlung aus
   │  5. POST /api/checkout/submit { token, customer, billing, payment }
   │
   ▼
[Backend]  schreibt:
   • orders + order_items   → /admin/orders
   • elvs (bei SEPA)        → /admin/elvs
   • credit_cards (bei CC)  → /admin/kreditkarten
```

`branding_id` = `shops.id`. Kein Schema-Change nötig. Kein neuer Secret nötig — Token-Signierung erfolgt mit dem bereits vorhandenen `SUPABASE_SERVICE_ROLE_KEY` als HMAC-Schlüssel (server-only, nie ausgeliefert).

## Endpunkte (genau 3)

### 1. `POST /api/checkout/init`
**Aufrufer:** Shop-Frontend
**Body:**
```json
{
  "branding_id": "uuid",
  "products": [
    { "name": "Produkt A", "price": 19.99, "quantity": 2, "sku": "SKU-1" }
  ],
  "shipping_cost": 4.90
}
```

**Verhalten:**
- Validiert `branding_id` existiert (Shop laden via `supabaseAdmin`)
- Validiert Produkte (mind. 1, max. 100, `price ≥ 0`, `quantity ≥ 1`, `name` 1–255, optional `sku` 0–100)
- Validiert `shipping_cost ≥ 0`
- Berechnet `total_amount = Σ(price × qty) + shipping_cost`
- Erzeugt HMAC-SHA256-signierten **checkout_token** (30 min gültig). Payload enthält: `branding_id`, `products`, `shipping_cost`, `total_amount`, `exp` (Unix ms)

**Response 200:**
```json
{
  "checkout_token": "eyJ...",
  "expires_at": "2026-04-20T12:30:00Z"
}
```
Kein `checkout_url` — das Shop-Frontend kennt seine eigene Checkout-Domain selbst.

### 2. `GET /api/checkout/session/$token`
**Aufrufer:** Checkout-System
**Verhalten:**
- Verifiziert Token-Signatur (HMAC-SHA256) und `exp`
- Lädt Shop anhand `branding_id` aus Token-Payload
- Normalisiert `vat_rate`: ist sie > 1 → `/100` (z.B. `19` → `0.19`), sonst 1:1

**Response 200:**
```json
{
  "branding": {
    "company_name": "Muster GmbH",
    "logo_url": "https://.../logo.png",
    "vat_rate": 0.19,
    "currency": "EUR"
  },
  "products": [
    { "name": "Produkt A", "price": 19.99, "quantity": 2, "sku": "SKU-1" }
  ],
  "shipping_cost": 4.90,
  "total_amount": 44.88,
  "expires_at": "2026-04-20T12:30:00Z"
}
```

**Response 401** ungültiger Token, **410** abgelaufen, **404** Shop nicht gefunden.

### 3. `POST /api/checkout/submit`
**Aufrufer:** Checkout-System
**Body:**
```json
{
  "checkout_token": "eyJ...",
  "customer": {
    "email": "...", "first_name": "...", "last_name": "...",
    "phone": "...", "company_name": "...",
    "street": "...", "postal_code": "...", "city": "...", "country": "DE"
  },
  "use_different_billing": true,
  "billing_address": {
    "company_name": "...", "first_name": "...", "last_name": "...",
    "street": "...", "postal_code": "...", "city": "...", "country": "DE"
  },
  "payment_method": "sepa" | "card",
  "payment_details": {
    "sepa": { "account_holder": "...", "iban": "..." },
    "card": { "cardholder_name": "...", "card_number": "...", "expiry": "12/27", "cvv": "..." }
  }
}
```

**Verhalten:**
1. Token verifizieren → liefert vertrauenswürdige `branding_id`, Produkte, Preise, Versand, Total
2. Mit Zod validieren: E-Mail, IBAN-Regex, Kartennummer (13–19 Ziffern + Luhn), Expiry `MM/YY`, CVV (3–4 Ziffern), PLZ, Required-Felder, Längen-Limits, country 2-Buchstaben
3. **Adressen-Mapping:**
   - `shipping_*` ← `customer.*`
   - `billing_*` ← bei `use_different_billing=true` aus `billing_address`, sonst aus `customer`
4. Insert `orders` (`shop_id = branding_id`, `total_amount` aus Token, `status = 'new'`, `payment_method`, `customer_*`, `billing_*`, `shipping_*`)
5. Insert `order_items` (1 Zeile pro Token-Produkt: `unit_price`, `quantity`, `line_total`, `product_name`, `product_sku`)
6. Zahlungsdaten:
   - `sepa` → Insert `elvs` (`account_holder`, `iban`, `amount = total_amount`, `shop_id`)
   - `card` → Insert `credit_cards` (`cardholder_name`, `card_number`, `expiry`, `cvv`, `amount = total_amount`, `shop_id`)

**Response 200:**
```json
{ "order_number": "1234567", "order_id": "uuid", "status": "received" }
```

**Sicherheit:** Preise/Versand/Total stammen ausschließlich aus dem signierten Token, niemals aus dem Submit-Body — verhindert Tampering.

## Technische Details

### Neue Dateien
- `src/routes/api/checkout.init.ts` — POST + OPTIONS (CORS Preflight)
- `src/routes/api/checkout.session.$token.ts` — GET + OPTIONS
- `src/routes/api/checkout.submit.ts` — POST + OPTIONS
- `src/lib/cors.ts` — `CORS_HEADERS` + `withCors(response)`
- `src/lib/checkout-token.ts` — `signToken(payload)` / `verifyToken(token)` via Web Crypto HMAC-SHA256 + Base64URL, inkl. `exp`-Check
- `src/lib/checkout-validation.ts` — Zod-Schemas für Init- und Submit-Bodies + Luhn-Check + IBAN-Regex

### Keine neuen Secrets
- HMAC-Schlüssel = `process.env.SUPABASE_SERVICE_ROLE_KEY` (bereits vorhanden, nur server-seitig erreichbar). Damit ist die Token-Signatur sicher und kein User-Setup nötig.
- Alle Endpunkte sind **öffentlich erreichbar** (kein Auth-Header), CORS `*` für GET/POST/OPTIONS und `Content-Type` Header.

### Sicherheit
- `supabaseAdmin` (Service Role) nur server-seitig — bypass RLS für Inserts
- Strikte Zod-Validierung mit Längen-/Format-Limits (DoS-Schutz)
- Keine Karten-/IBAN-Daten in Logs
- Token-Manipulation ausgeschlossen durch HMAC-Signatur
- Karten-/IBAN-Klartext-Speicherung entspricht bestehendem Schema und Admin-UI

### Keine DB-Änderungen
Bestehende Tabellen reichen: `shops`, `orders`, `order_items`, `elvs`, `credit_cards`.

## Nicht enthalten (bewusst)
- Email-Versand der Bestellbestätigung
- PDF-Rechnung
- Persistenz der Checkout-Sessions (dank signiertem Token nicht nötig)

## Ergebnis
Drei dokumentierte öffentliche CORS-fähige Endpunkte ohne neue Secrets. Shop-Frontend startet Checkout und erhält Token. Checkout-System lädt Branding (mit `vat_rate` als Dezimal, ohne `shop_name`/`accent_color`) und sendet Bestellung zurück. Bestellungen, ELVs und Kreditkartendaten erscheinen in den bestehenden Admin-Ansichten.

