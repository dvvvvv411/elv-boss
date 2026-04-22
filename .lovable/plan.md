

## Ziel
Nach jeder neuen Bestellung wird automatisch eine SMS via **seven.io** an die Kundenrufnummer geschickt — mit Dank + Hinweis, dass der App-Download-Link in der Bestätigungsmail zu finden ist. Absendername kommt pro Shop aus `shops.sms_sender_name`.

---

## 1. Konfiguration

**Ein globales Secret** (für alle Shops):

| Secret | Zweck |
|---|---|
| `SEVEN_IO_API_KEY` | API-Key von seven.io (Dashboard → Developer → API Keys) |

Wird beim Plan-Approve abgefragt. Keine DB-Migration, keine neue Spalte.

`shops.sms_sender_name` ist bereits vorhanden und wird genutzt. Wenn leer → seven.io-Default-Absender.

---

## 2. Telefonnummer-Normalisierung (DE → E.164)

Hilfsfunktion `normalizeDePhone()`:

| Eingabe | Ausgabe |
|---|---|
| `0176 1234567` | `+491761234567` |
| `0176-123 4567` | `+491761234567` |
| `+49 176 1234567` | `+491761234567` |
| `0049 176 1234567` | `+491761234567` |
| `49 176 1234567` | `+491761234567` |
| `176 1234567` | `+491761234567` |

Logik:
1. Alle Nicht-Ziffern und Nicht-`+` entfernen
2. `00` am Anfang → `+`
3. `0` am Anfang → `+49`
4. `49` (ohne `+`) am Anfang → `+` voranstellen
5. Sonst → `+49` voranstellen
6. Validierung: `^\+49[1-9][0-9]{6,14}$` — sonst skip + Log-Warn

---

## 3. SMS-Text (immer gleich, ohne URL)

```
Hallo {Vorname}, vielen Dank für Ihre Bestellung #{order_number} bei {shop_name}!

Den Download-Link für unsere App finden Sie in Ihrer Bestellbestätigung per E-Mail. Über die App können Sie Ihren Liefertermin wählen.

Ihr {shop_name}-Team
```

**Beispiel** (Shop „Piana Heizöl", Bestellung 1234567, Vorname Max):

```
Hallo Max, vielen Dank für Ihre Bestellung #1234567 bei Piana Heizöl!

Den Download-Link für unsere App finden Sie in Ihrer Bestellbestätigung per E-Mail. Über die App können Sie Ihren Liefertermin wählen.

Ihr Piana Heizöl-Team
```

Keine Abhängigkeit von `app_download_url` — Text immer identisch.

---

## 4. Neue Edge Function `send-sms-notification`

`supabase/functions/send-sms-notification/index.ts`
**`config.toml`:** `verify_jwt = false`
**Auth:** `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` Pflicht — außer im Test-Modus (`{ test: true, ... }`), analog zur Telegram-Function.

**Body (Produktiv):** `{ order_id: uuid }`
**Body (Test):** `{ test: true, phone: "0176...", shop_id: uuid }`

**Ablauf Produktiv:**
1. Bearer-Check (außer Test-Modus)
2. Lade `orders` (customer_first_name, customer_phone, order_number, shop_id)
3. Lade `shops` (shop_name, sms_sender_name)
4. `customer_phone` leer → `200 { skipped: "no_phone" }`
5. Telefon normalisieren → invalid → `200 { skipped: "invalid_phone" }`
6. `SEVEN_IO_API_KEY` fehlt → `200 { skipped: "no_api_key" }`
7. SMS-Text bauen
8. POST an `https://gateway.seven.io/api/sms`:
   ```
   Headers: { "X-Api-Key": SEVEN_IO_API_KEY, "Content-Type": "application/json" }
   Body:    { "to": "+491761234567",
              "text": "Hallo Max, ...",
              "from": shop.sms_sender_name || undefined }
   ```
9. Response prüfen (`success: "100"` = OK). Fehler → Log-Error, `500`
10. Erfolg → `200 { success: true, message_id }`

**Test-Modus:** Sendet Kurz-SMS `"Test-SMS von {sms_sender_name} via seven.io ✓"` an die übergebene Nummer.

---

## 5. `submit-order` erweitern

Nach ELV-/Card-Insert, parallel zu Telegram-Trigger:
- Async `fetch` an `send-sms-notification` mit `{ order_id }` + Service-Role-Bearer
- In `EdgeRuntime.waitUntil(...)` — blockiert Checkout NICHT
- SMS-Fehler werden geloggt, brechen Bestellung nicht ab

---

## 6. Admin-UI — Test-Sektion in `/admin/shops/{id}/edit`

Neben dem bestehenden Feld „SMS Absendername":
- Info-Hinweis: „SMS werden via seven.io versendet. API-Key ist serverseitig hinterlegt."
- Input für Testnummer + Button **„Test-SMS senden"**
- Ruft `send-sms-notification` mit `{ test: true, phone, shop_id }` auf

Kein eigener `/admin/sms`-Reiter.

---

## 7. Verhaltens-Matrix

| Szenario | Verhalten |
|---|---|
| Kunde hat keine Telefonnummer | Skip, Log, Bestellung ok |
| Telefonnummer ungültig | Skip, Log-Warn, Bestellung ok |
| `SEVEN_IO_API_KEY` fehlt | Skip, Log-Warn, Bestellung ok |
| `sms_sender_name` leer | seven.io-Default-Absender |
| seven.io-API down | Log-Error, Bestellung ok, kein Retry |

---

## 8. Geänderte / neue Dateien

| Datei | Aktion |
|---|---|
| Secret `SEVEN_IO_API_KEY` | neu (wird abgefragt) |
| `supabase/functions/send-sms-notification/index.ts` | neu |
| `supabase/functions/_shared/phone.ts` | neu (`normalizeDePhone`) |
| `supabase/config.toml` | Eintrag |
| `supabase/functions/submit-order/index.ts` | SMS-Trigger ergänzt |
| `src/components/admin/ShopForm.tsx` | Test-SMS-Button + Input |

Keine DB-Migration.

---

## 9. Nächster Schritt
Nach Freigabe wird `SEVEN_IO_API_KEY` abgefragt. Key zu finden unter: **seven.io Dashboard → Entwickler → API-Keys → „Neuer API-Key"** mit Berechtigung „SMS senden".

