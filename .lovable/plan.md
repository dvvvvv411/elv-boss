

## Ziel
Neuer Reiter `/admin/preview` mit zwei Sektionen: **Rechnungs-PDF-Preview** und **Bestellbestätigungs-Email-Preview**. Beides als Live-Vorschau gerendert mit echten Beispieldaten aus dem ausgewählten Shop + einer ausgewählten Beispiel-Bestellung (oder Mock-Daten falls noch keine Bestellung existiert). Branding-Farbe (`shops.accent_color`) wird durchgehend verwendet.

> Hinweis: PDF-Generierung & Email-Versand selbst werden in dieser Iteration **nicht** implementiert — das hier ist nur die visuelle Vorlage zum Approven. Sobald du sie freigibst, baue ich im nächsten Schritt die echte PDF-Generierung (server-side) und das Anhängen an die Bestellbestätigungs-Mail.

## Route
- `src/routes/admin.preview.tsx` — Page mit beiden Sektionen
- Sidebar-Eintrag in `AdminShell.tsx` nach „Kreditkarten": `{ title: "Preview", icon: FileText, to: "/admin/preview" }`

## Toolbar (oben auf der Preview-Seite)
- **Shop-Auswahl** (Dropdown, alle Shops aus `shops`) — wählt Branding/Stammdaten
- **Bestellungs-Auswahl** (Dropdown, neueste 20 Bestellungen des gewählten Shops) — optional; falls leer, werden realistische Demo-Daten verwendet, damit das Layout vollständig sichtbar ist
- **Zoom** (50% / 75% / 100%) für PDF-Preview

Alle dargestellten Werte stammen ausschließlich aus `shops` + `orders` + `order_items` — **keine Hardcoded Inhalte**.

---

## Sektion 1 — Rechnungs-PDF-Vorschau

DIN A4 (`210mm × 297mm`) als skalierter HTML-Block (`@media print`-ready, später 1:1 zu PDF). Branding-Akzent = `shops.accent_color`.

### Layout-ASCII

```text
┌──────────────────────────────────────────────────────────────────┐
│ [LOGO]                                  shop_name                │  ← Header
│ shop_name (groß)                        address                  │     accent-Linie
│ slogan/website                          postal_code city         │     darunter
│                                         country                  │
│                                         phone · email            │
│ ════════════════════════════════════════════════════════════════ │  ← accent_color
│                                                                  │
│  RECHNUNGSADRESSE              LIEFERADRESSE                     │
│  Vorname Nachname              Vorname Nachname                  │
│  billing_street                shipping_street                   │
│  PLZ Ort                       PLZ Ort                           │
│  Land                          Land                              │
│                                (oder „identisch mit Rechnung")   │
│                                                                  │
│                                ┌─────────────────────────────┐   │
│                                │ RECHNUNG                    │   │
│                                │ Rechnungs-Nr.: order_number │   │
│                                │ Rechnungsdatum: heute       │   │
│                                │ Bestellnummer:  order_number│   │
│                                │ Bestelldatum:  created_at   │   │
│                                └─────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Pos │ Beschreibung │ SKU │ Menge │ MwSt │ Einzel │ Summe │    │  ← Header in
│  ├──────────────────────────────────────────────────────────┤    │     accent_color
│  │  1  │ Produkt A    │ ... │   2   │ 19%  │ 12,61€ │ 25,21€│    │
│  │  2  │ Produkt B    │ ... │   1   │ 19%  │  8,40€ │  8,40€│    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│                                  ┌────────────────────────────┐  │
│                                  │ Zwischensumme   28,24 €    │  │
│                                  │ MwSt 19%         5,37 €    │  │
│                                  │ ─────────────────────────  │  │
│                                  │ GESAMT          33,61 €    │  │  ← accent
│                                  └────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ZAHLUNGSDETAILS                                            │  │
│  │  ELV: Lastschrift vom Konto IBAN ****1234                  │  │
│  │  ODER                                                      │  │
│  │  Kreditkarte: Wird bei Lieferung abgebucht                 │  │
│  │  (Karte ****4242, Inhaber: Vorname Nachname)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Vielen Dank für Ihren Einkauf bei {shop_name}!                  │
│                                                                  │
│ ════════════════════════════════════════════════════════════════ │  ← accent
│  Unternehmen     │ Kontakt        │ Rechtliches    │ Bank        │
│  shop_name       │ phone          │ HRB: c_reg_no  │ —           │
│  business_owner  │ email          │ USt-ID: vat_id │             │
│  address         │ website        │ court          │             │
└──────────────────────────────────────────────────────────────────┘
```

### MwSt-Berechnung (Brutto → Netto)
- Pro `order_items.unit_price` (brutto):
  `net_unit = unit_price / (1 + vat_rate/100)`
  `vat_unit = unit_price - net_unit`
- `Zwischensumme` = Σ `net_unit × quantity`
- `MwSt` = Σ `vat_unit × quantity`
- `Gesamt` = `orders.total_amount` (Brutto, exakt aus DB)
- `vat_rate` kommt aus `shops.vat_rate`

### Zahlungsdetails-Card
- Quelle: `orders.payment_method` (oder gewählter ELV-/CC-Eintrag, falls vorhanden)
- Wenn `elv` (oder `payment_method` enthält „lastschrift"/"elv"): zeige IBAN maskiert (`DE** **** **** **** **12 34`), Kontoinhaber, Bank
- Wenn `credit_card`: Text **„Wird bei Lieferung abgebucht"**, plus Kartennummer maskiert (`**** **** **** 1234`), Inhaber, Ablauf
- Beide Daten werden — wenn vorhanden — aus `elvs`/`credit_cards` derselben Bestellung gezogen (per `order_id`-Match auf neuestem Eintrag desselben Shops als Fallback für Demo)

### Footer (4 Spalten, accent-Linie darüber)
1. **Unternehmen** — `shop_name`, `business_owner`, `address`, `postal_code city`
2. **Kontakt** — `phone`, `email`, `website`
3. **Rechtliches** — `commercial_register_number` (HRB), `vat_id` (USt-ID), `court`
4. **Bank / Hinweise** — Platzhalter „—" wenn keine Bankdaten in `shops` (aktuell keine Spalte vorhanden, daher leer); Hinweis: Beträge in `currency`

---

## Sektion 2 — Email-Vorlage „Bestellbestätigung"

Gerendert als Email-typischer 600px-Container mit Branding-Akzent.

### Layout-ASCII

```text
┌──────────────────────────────────────────┐
│         [Shop-Logo, zentriert]           │
│ ════════════════════════════════════════ │  ← accent_color (3px)
│                                          │
│   Hallo {customer_first_name},           │
│                                          │
│   vielen Dank für deine Bestellung bei   │
│   {shop_name}! Wir haben deine           │
│   Bestellung erhalten und bearbeiten     │
│   sie schnellstmöglich.                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ BESTELLDETAILS                     │  │  ← accent-Heading
│  │ Bestellnummer:  #order_number      │  │
│  │ Bestelldatum:   created_at         │  │
│  │ Zahlungsart:    payment_method     │  │
│  └────────────────────────────────────┘  │
│                                          │
│   PRODUKTE                               │
│   ─────────────────────────────────────  │
│   2 × Produkt A              25,21 €     │
│   1 × Produkt B               8,40 €     │
│   ─────────────────────────────────────  │
│   Zwischensumme              28,24 €     │
│   MwSt (19%)                  5,37 €     │
│   ─────────────────────────────────────  │
│   GESAMT                     33,61 €     │  ← accent, bold
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ LIEFERADRESSE                      │  │
│  │ Vorname Nachname                   │  │
│  │ Straße, PLZ Ort, Land              │  │
│  └────────────────────────────────────┘  │
│                                          │
│   📎 Anhang: Rechnung-{order_number}.pdf │
│                                          │
│  [  Bestellung ansehen  ]                │  ← accent-Button
│                                          │
│   Bei Fragen melde dich unter            │
│   {shop_email} oder {shop_phone}.        │
│                                          │
│ ════════════════════════════════════════ │
│  {shop_name} · {address}                 │
│  {website} · Impressum                   │
└──────────────────────────────────────────┘
```

### Inhalte (alle dynamisch)
- **Header**: `shops.logo_url`, accent-Linie
- **Anrede**: `customer_first_name`
- **Order-Block**: `order_number`, `created_at`, `payment_method`
- **Produkte**: aus `order_items` (Menge × Name → Brutto-Summe pro Zeile)
- **Summenblock**: gleiche MwSt-Berechnung wie Rechnung (`shops.vat_rate`)
- **Lieferadresse**: aus `shipping_*` (oder `billing_*` wenn identisch)
- **Anhang-Hinweis**: nur visueller Hinweis in der Vorschau, dass die PDF angehängt wird
- **CTA-Button**: accent-Farbe, Text „Bestellung ansehen" (Link-Ziel kommt später)
- **Footer**: `shop_name`, `address`, `website`

---

## Daten-Flow
- React-Query Hook lädt: alle Shops, dann gewählten Shop + Bestellung + Items + (optional) ELV/CC-Eintrag
- Falls **keine** Bestellung im gewählten Shop existiert: Demo-Order-Objekt im Frontend mit realistischen Werten (Markierung „Demo-Daten — keine echte Bestellung") — damit die Vorschau immer vollständig ist
- Branding-Farbe wird via CSS-Variable `--brand` an die Templates gegeben

## Komponenten-Aufbau
- `src/components/admin/preview/PreviewPage.tsx` — Toolbar + Tabs/Sections-Wrapper
- `src/components/admin/preview/InvoicePreview.tsx` — A4-Rechnung
- `src/components/admin/preview/EmailPreview.tsx` — Email-Mockup
- `src/lib/invoice-math.ts` — Brutto→Netto/MwSt-Helper

## Nicht enthalten (bewusst)
- Echte PDF-Generierung (kommt nach Approve)
- Echter Email-Versand / Anhang
- Persistierung der Templates in DB

## Ergebnis
Du siehst unter `/admin/preview` eine pixelgenaue, branding-gefärbte Vorschau beider Templates mit Live-Daten aus deinen Shops/Bestellungen und kannst Layout/Inhalte freigeben, bevor wir PDF + Mailversand bauen.

