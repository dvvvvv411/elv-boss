

## Ziel
Nach erfolgreicher Bestellung in `submit-order`:
1. Rechnungs-PDF lokal mit `jspdf` erzeugen (kein externer Service)
2. Bestellbestätigungs-Email per Resend mit PDF im Anhang versenden
3. Email **nur** wenn PDF-Generierung erfolgreich
4. Logo in der Email als **Text** in `shop.accent_color` (kein Bild)
5. Buttons: App-Download + Bestellung-ansehen

Pro-Shop-Branding aus `shops` (`resend_api_key`, `sender_email`, `sender_name`, `accent_color`, `app_download_url`, `website`).

**Keine neuen Secrets.** Kein DB-Migration. Kein UI-Change.

---

## 1. Domain-Quelle
`shops.website` wird normalisiert (`https?://` strippen, `www.` strippen, trailing `/` strippen) und ergibt:
```
https://checkout.{normalisierte_domain}/confirmation/{order_number}
```

---

## 2. PDF-Generierung — `jspdf` lokal in der Edge Function

**Neue Datei:** `supabase/functions/_shared/invoice-math.ts`
Deno-Port von `src/lib/invoice-math.ts` (`maskIban`, `maskCard`, `computeTotals`, `formatMoney`, `formatDate`, `netUnit`).

**Neue Datei:** `supabase/functions/_shared/invoice-pdf.ts`
- Import: `https://esm.sh/jspdf@2.5.2`
- Export `renderInvoicePDF(shop, order, items, payment): Uint8Array`
- DIN-A4, Helvetica, Akzentfarbe für Header/Trennlinien
- Inhalt analog `InvoicePreview.tsx`:
  - Kopf: **Firmenname als Text** in `shop.accent_color`, Adresse, USt-ID, Kontakt
  - Rechnungs-Nr = `order_number`, Datum, Rechnungs- + ggf. Lieferadresse
  - Items-Tabelle (Pos · Bezeichnung · Menge · Einzel · Gesamt)
  - Totals: Netto · MwSt · Versand · Brutto
  - Zahlungs-Box: SEPA (maskierte IBAN) **oder** Card (maskierte Nummer)
  - Footer: Geschäftsinhaber, Amtsgericht, HRB, USt-ID

---

## 3. Email-HTML

**Neue Datei:** `supabase/functions/_shared/email-html.ts`
Export `renderConfirmationEmailHTML(shop, order, items, links): string`. Layout analog `EmailPreview.tsx`:
- Header: `shop.shop_name` als **Text in `shop.accent_color`**, fett, große Schrift, kein `<img>`
- Bestätigungstext + Bestellnummer
- Bestelldetails-Box (Items + Totals)
- Zwei Inline-Buttons:
  - „App herunterladen" → `shop.app_download_url` (ausblenden wenn null)
  - „Bestellung ansehen" → aus `shop.website` gebaut (ausblenden wenn null)
- Footer mit Firmendaten

---

## 4. Neue Edge Function `send-order-confirmation`

**Datei:** `supabase/functions/send-order-confirmation/index.ts`
**`config.toml`:** `verify_jwt = false`

**Schutz vor öffentlichem Missbrauch (ohne Secret):** Die Function ist **nicht** über das offene Internet sinnvoll aufrufbar, weil sie zwingend mit dem `SUPABASE_SERVICE_ROLE_KEY` als Bearer-Header aufgerufen werden muss. Dieser Key liegt bereits in den Function-Secrets (siehe `<secrets>`) und wird beim internen `fetch` von `submit-order` mitgesendet. Externe Aufrufer haben den Key nicht → können die Function nicht missbrauchen.

**Body:** `{ "order_id": "uuid" }`

**Ablauf:**
1. Bearer-Token aus `Authorization`-Header gegen `SUPABASE_SERVICE_ROLE_KEY` prüfen → sonst `401`
2. Lade `orders` + `order_items` + `shops` + jüngste `elvs`/`credit_cards` (per `shop_id` + Halter-Name + neuester `created_at`)
3. Validiere `shop.resend_api_key`, `shop.sender_email`, `shop.sender_name` — fehlt etwas → `400`, kein Send
4. PDF generieren via `renderInvoicePDF(...)`. Exception → `500`, kein Email-Send
5. PDF → Base64
6. URLs: `appDownloadUrl = shop.app_download_url`, `orderViewUrl = shop.website ? https://checkout.${normalize(shop.website)}/confirmation/${order.order_number} : null`
7. Email-HTML via `renderConfirmationEmailHTML(...)`
8. Resend-POST `https://api.resend.com/emails` mit `Authorization: Bearer {shop.resend_api_key}`:
   - `from`: `{shop.sender_name} <{shop.sender_email}>`
   - `to`: `[order.customer_email]`
   - `subject`: `Bestellbestätigung #{order.order_number} – {shop.shop_name}`
   - `html`: emailHTML
   - `attachments`: `[{ filename: Rechnung-{order_number}.pdf, content: pdfBase64 }]`
9. Resend-Fehler → `500` mit Body durchgereicht
10. Erfolg → `200 { success: true, resend_id }`

---

## 5. `submit-order` erweitern

Direkt nach erfolgreichem Order-Insert (vor dem Return):
- Asynchroner `fetch` an `https://{SUPABASE_URL}/functions/v1/send-order-confirmation` mit `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}` und `{ order_id }`
- Per `EdgeRuntime.waitUntil(...)` — blockiert die Checkout-Response NICHT
- Email-/PDF-Fehler werden geloggt, brechen `submit-order` nicht ab

---

## 6. Geänderte / neue Dateien

| Datei | Aktion |
|---|---|
| `supabase/functions/_shared/invoice-math.ts` | neu |
| `supabase/functions/_shared/invoice-pdf.ts` | neu (jspdf) |
| `supabase/functions/_shared/email-html.ts` | neu |
| `supabase/functions/send-order-confirmation/index.ts` | neu |
| `supabase/functions/submit-order/index.ts` | um Trigger erweitert |
| `supabase/config.toml` | Eintrag für neue Function |

Keine DB-Migration. Kein neuer Secret. Kein UI-Change.

---

## 7. Verhaltens-Matrix

| Szenario | Verhalten |
|---|---|
| Shop ohne `resend_api_key`/`sender_email`/`sender_name` | Email skip, Log-Warn, Bestellung erfolgreich |
| Shop ohne `website` | „Bestellung ansehen"-Button ausgeblendet |
| Shop ohne `app_download_url` | „App herunterladen"-Button ausgeblendet |
| PDF-Generierung wirft Exception | Email **nicht** versendet, Log-Error |
| Resend-Fehler | Log-Error, kein Retry |
| Bestellung erfolgreich, Email-Pipeline schlägt fehl | Bestellung bleibt gespeichert, Checkout-Antwort unverändert OK |

---

## 8. Email-Subject
`Bestellbestätigung #1234567 – Shop Name`

