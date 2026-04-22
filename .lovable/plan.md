

## Ziel
Nach erfolgreicher Bestellung in `submit-order`:
1. Rechnungs-PDF lokal in der Edge Function generieren (kein externer Service, `jspdf`)
2. Bestellbestätigungs-Email per Resend versenden — mit PDF im Anhang
3. Email **nur** wenn PDF-Generierung erfolgreich
4. Logo in der Email als **Text** in `shop.accent_color` (kein Bild)
5. Buttons korrekt verlinken (App-Download + Bestellung-ansehen)

Pro-Shop-Branding aus `shops` (`resend_api_key`, `sender_email`, `sender_name`, `accent_color`, `app_download_url`, `website`).

---

## 1. Keine DB-Migration nötig
`shops.website` existiert bereits und wird als Domain-Quelle verwendet. Die Confirmation-URL wird gebaut als:
```
https://checkout.{normalisierte_domain}/confirmation/{order_number}
```
Normalisierung: `https?://` strippen, führendes `www.` strippen, trailing `/` strippen.

---

## 2. PDF-Generierung — lokal mit `jspdf`

**Neue Datei:** `supabase/functions/_shared/invoice-math.ts` — Deno-Port von `src/lib/invoice-math.ts` (`maskIban`, `maskCard`, `computeTotals`, `formatMoney`, `formatDate`, `netUnit`).

**Neue Datei:** `supabase/functions/_shared/invoice-pdf.ts`
- Import `jspdf` via `https://esm.sh/jspdf@2.5.2`
- Export `renderInvoicePDF(shop, order, items, payment): Uint8Array`
- DIN-A4, Helvetica, Akzentfarbe für Header/Trennlinien
- Inhalt analog `InvoicePreview.tsx`:
  - Kopfbereich: **Firmenname als Text** in `shop.accent_color` (kein Bild), Adresse, USt-ID, Kontakt
  - Rechnungsnummer = `order_number`, Datum, Rechnungs- + ggf. Lieferadresse
  - Items-Tabelle (Pos · Bezeichnung · Menge · Einzelpreis · Gesamt) mit `doc.text()` + `doc.line()`
  - Totals: Netto, MwSt (`vat_rate`), Versand, Brutto
  - Zahlungs-Box: SEPA (maskierte IBAN) **oder** Card (maskierte Nummer)
  - Footer: Geschäftsinhaber, Amtsgericht, HRB, USt-ID

> Hinweis: `jspdf` rendert programmatisch — kein HTML/CSS. Inhaltlich identisch zu `/admin/preview`, visuell saubere PDF-Nachbildung. Pixel-Treue zur React-Preview ist nicht das Ziel.

---

## 3. Email-HTML

**Neue Datei:** `supabase/functions/_shared/email-html.ts`
- Export `renderConfirmationEmailHTML(shop, order, items, links): string`
- Layout entspricht `EmailPreview.tsx`:
  - **Header:** `shop.shop_name` als reiner **Text in `shop.accent_color`**, fett, große Schrift, kein `<img>`
  - Bestätigungstext + Bestellnummer
  - Bestelldetails-Box (Items + Totals)
  - Zwei Inline-Buttons:
    - **„App herunterladen"** → `links.appDownloadUrl` (= `shop.app_download_url`) — ausblenden wenn null
    - **„Bestellung ansehen"** → `links.orderViewUrl` (aus `shop.website` gebaut) — ausblenden wenn `shop.website` null
  - Footer mit Firmendaten

---

## 4. Neue Edge Function `send-order-confirmation`

**Datei:** `supabase/functions/send-order-confirmation/index.ts`
**`config.toml`:**
```toml
[functions.send-order-confirmation]
verify_jwt = false
```
**Auth:** Header `X-Internal-Secret` muss `INTERNAL_FUNCTION_SECRET` matchen, sonst `401`.

**Body:** `{ "order_id": "uuid" }`

**Ablauf:**
1. Secret prüfen
2. Lade `orders` + `order_items` + `shops` + jüngste `elvs`/`credit_cards` (per `shop_id` + Halter-Name + neuester `created_at`)
3. Validiere `shop.resend_api_key`, `shop.sender_email`, `shop.sender_name` — wenn fehlend: `400`, kein Send
4. PDF generieren via `renderInvoicePDF(...)`. Bei Exception → `500`, kein Email-Send
5. PDF → Base64
6. URLs bauen:
   - `appDownloadUrl = shop.app_download_url`
   - `orderViewUrl = shop.website ? \`https://checkout.${normalize(shop.website)}/confirmation/${order.order_number}\` : null`
7. Email-HTML via `renderConfirmationEmailHTML(...)`
8. Resend-Send mit shop-eigenem Key:
   ```
   POST https://api.resend.com/emails
   Authorization: Bearer {shop.resend_api_key}
   Body: {
     from: "{shop.sender_name} <{shop.sender_email}>",
     to: [order.customer_email],
     subject: "Bestellbestätigung #{order.order_number} – {shop.shop_name}",
     html: emailHTML,
     attachments: [{
       filename: "Rechnung-{order_number}.pdf",
       content: pdfBase64
     }]
   }
   ```
9. Bei Resend-Fehler → `500` mit Body durchgereicht
10. Erfolg → `200 { success: true, resend_id }`

---

## 5. `submit-order` erweitern

Direkt nach erfolgreichem Order-Insert (vor dem Return):
- Asynchroner `fetch` an `send-order-confirmation` mit Header `X-Internal-Secret` und `{ order_id }`
- Per `EdgeRuntime.waitUntil(...)` — blockiert die Checkout-Response NICHT
- Email-/PDF-Fehler werden geloggt, brechen `submit-order` nicht ab

---

## 6. Neuer Secret

| Secret | Zweck |
|---|---|
| `INTERNAL_FUNCTION_SECRET` | Schutz vor öffentlichem Aufruf von `send-order-confirmation` |

`resend_api_key` liegt pro Shop in der DB — kein globaler Secret.

---

## 7. Geänderte / neue Dateien

| Datei | Aktion |
|---|---|
| `supabase/functions/_shared/invoice-math.ts` | neu (Deno-Port) |
| `supabase/functions/_shared/invoice-pdf.ts` | neu (jspdf) |
| `supabase/functions/_shared/email-html.ts` | neu |
| `supabase/functions/send-order-confirmation/index.ts` | neu |
| `supabase/functions/submit-order/index.ts` | um Trigger erweitert |
| `supabase/config.toml` | Eintrag für neue Function |

Keine DB-Migration. Kein UI-Change in `ShopForm.tsx`.

---

## 8. Verhaltens-Matrix

| Szenario | Verhalten |
|---|---|
| Shop ohne `resend_api_key`/`sender_email`/`sender_name` | Email skip, Log-Warn, Bestellung erfolgreich |
| Shop ohne `website` | „Bestellung ansehen"-Button ausgeblendet |
| Shop ohne `app_download_url` | „App herunterladen"-Button ausgeblendet |
| PDF-Generierung wirft Exception | Email **nicht** versendet, Log-Error |
| Resend-Fehler | Log-Error, kein Retry |
| Bestellung erfolgreich, Email-Pipeline schlägt fehl | Bestellung bleibt gespeichert, Checkout-Antwort unverändert OK |

---

## 9. Email-Subject
`Bestellbestätigung #1234567 – Shop Name`

