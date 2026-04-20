

## Ziel
Drei öffentliche HTTP-Endpunkte als TanStack Server Routes bereitstellen, damit **Shop-Frontend** und **Checkout-System** mit dem Backend kommunizieren können.

## Korrigierter Flow

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
   │     → personalisiert UI + zeigt Warenkorb
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

`branding_id` = `shops.id`. Kein Schema-Change nötig.

## Endpunkte (genau 3)

### 1. `POST /api/checkout/init` — Shop-Frontend startet Checkout
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
- Validiert `branding_id` existiert (Shop laden)
- Validiert Produkte (mind. 1, Preise ≥ 0, Mengen ≥ 1, max. 100 Items)
- Berechnet `total_amount = Σ(price × qty) + shipping_cost`
- Erzeugt HMAC-signierten **checkout_token** (30 min gültig) mit Payload: `branding_id`, products, shipping_cost, total, exp
- Gibt nur den Token + Ablaufzeit zurück (Branding kommt erst beim nächsten Step)

**Response 200:**
```json
{
  "checkout_token": "eyJ...",
  "expires_at": "2026-04-20T12:30:00Z",
  "checkout_url": "https://<checkout-domain>/?token=eyJ..."
}
```

### 2. `GET /api/checkout/session/:token` — Checkout-System lädt Session + Branding
**Aufrufer:** Checkout-System (nach Redirect vom Shop)  
**Verhalten:**
- Verifiziert Token-Signatur und Ablauf
- Lädt Shop anhand `branding_id` aus Token
- Gibt Branding + Warenkorb-Daten zurück

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

**Wichtig zur MwSt:** `shops.vat_rate` ist als Prozentzahl gespeichert (z.B. `19`). Backend liefert sie als Dezimal: `vat_rate / 100` → `0.19`. Falls schon dezimal hinterlegt (`<= 1`), 1:1 weiterreichen.

**Response 401/410:** ungültiger / abgelaufener Token.

### 3. `POST /api/checkout/submit` — Bestellung abschicken
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

**Verhalten (atomar):**
1. Token verifizieren → liefert vertrauenswürdige `branding_id`, Produkte, Preise, Versand, Total
2. Eingaben mit Zod validieren: E-Mail, IBAN-Regex, Kartennummer (13–19 Ziffern + Luhn), Expiry `MM/YY`, CVV (3–4), PLZ, Required-Felder, Längen-Limits
3. **Adressen-Mapping in Order:**
   - Lieferadresse = `customer.*` → `shipping_*` Felder
   - Rechnungsadresse = bei `use_different_billing=true` aus `billing_address`, sonst = `customer` → `billing_*` Felder
4. Insert `orders` (`shop_id = branding_id`, `total_amount` aus Token, `status = 'new'`, `payment_method`, `customer_*`, `billing_*`, `shipping_*`)
5. Insert `order_items` (1 Zeile pro Produkt aus Token, `unit_price`, `line_total`)
6. Zahlungsdaten:
   - `sepa` → Insert `elvs` (account_holder, iban, amount = total, shop_id)
   - `card` → Insert `credit_cards` (cardholder_name, card_number, expiry, cvv, amount = total, shop_id)

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
- `src/lib/cors.ts` — gemeinsame CORS-Header (`*`, GET/POST/OPTIONS, `Content-Type`)
- `src/lib/checkout-token.ts` — `signToken(payload)` / `verifyToken(token)` via Web Crypto HMAC-SHA256 + Base64URL, inkl. `exp`-Check
- `src/lib/checkout-validation.ts` — Zod-Schemas für Init- und Submit-Bodies + Luhn-Check + IBAN-Regex

### Neuer Secret
- **`CHECKOUT_SIGNING_SECRET`** — wird beim Approve angefordert (oder automatisch generiert), nur serverseitig genutzt zum Signieren/Verifizieren des Tokens

### Optionaler Konfig-Wert
- **`CHECKOUT_BASE_URL`** — Basis-URL des externen Checkout-Systems, wird bei `init` zur Konstruktion der `checkout_url` verwendet (falls nicht gesetzt: `checkout_url` weglassen)

### Sicherheit
- Service-Role nur serverseitig via `supabaseAdmin`
- CORS offen (`*`) — Endpunkte sind bewusst öffentlich für Drittsysteme
- Strikte Zod-Validierung mit Längen- und Format-Limits
- Keine PII/PCI-Logging (Karten-/IBAN-Daten nie in Logs)
- Kreditkarten/IBAN im Klartext in DB — entspricht bestehendem Schema und Admin-UI

### Keine DB-Änderungen
Bestehende Tabellen reichen: `shops`, `orders`, `order_items`, `elvs`, `credit_cards`.

## Nicht enthalten (bewusst)
- Email-Versand der Bestellbestätigung (folgt separat, nutzt vorhandenes Template)
- PDF-Rechnung
- Webhook-Signatur vom Checkout-System (kann später ergänzt werden)
- Persistenz der Checkout-Sessions (nicht nötig dank signiertem Token)

## Ergebnis
Drei dokumentierte CORS-fähige Endpunkte. Shop-Frontend startet Checkout und erhält Token. Checkout-System lädt Branding (mit `vat_rate` als Dezimal, ohne `shop_name`/`accent_color`) und sendet Bestellung zurück. Bestellungen, ELVs und Kreditkartendaten erscheinen in den bestehenden Admin-Ansichten.

