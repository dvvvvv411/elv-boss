

## Ziel
Optionales Feld „App-Download-URL" pro Shop, das bei `submit-order` zusätzlich zur `order_number` zurückgegeben wird.

## Änderungen

### 1. DB-Migration
- Neue Spalte in `shops`: `app_download_url text NULL` (optional, kein Default).

### 2. Shop-Formular (`src/components/admin/ShopForm.tsx`)
- `ShopFormValues` um `app_download_url: string` erweitern, in `emptyShop` als `""`.
- Im Zod-Schema: optional, max 500, leerer String erlaubt.
- Neues Feld im Abschnitt „Allgemein" (oder neuer Abschnitt „App") — `Input` mit `placeholder="https://..."`, Label „App-Download-URL (optional)".

### 3. Edge Function `submit-order`
- Nach erfolgreichem Order-Insert: `app_download_url` aus `shops` (per `session.shop_id`) laden.
- Response erweitern: `{ success: true, order_number, app_download_url: string | null }`.

### 4. Keine Änderung an `get-checkout-session` und `create-checkout-session`.

## API-Referenz für Checkout-System (nach Deploy)

**Endpoint:** `POST https://jpielhyfzzznicvcanci.supabase.co/functions/v1/submit-order`

**Response (200) – neu:**
```json
{
  "success": true,
  "order_number": "1234567",
  "app_download_url": "https://apps.example.com/download"
}
```
- `app_download_url` ist `string` oder `null` (wenn der Shop keine URL hinterlegt hat).
- Request-Body bleibt unverändert.
- Fehler-Responses bleiben unverändert (`400`, `404`, `410`, `500`).

**Verwendung im Checkout:**
```ts
const result = await res.json();
if (result.success) {
  // Bestellnummer: result.order_number
  // App-Download-Link (kann null sein): result.app_download_url
  if (result.app_download_url) {
    // Button/Link „App herunterladen" anzeigen
  }
}
```

