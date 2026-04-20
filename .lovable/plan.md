

## Ziel
In `EmailPreview.tsx` einen prominenten **"App-Download-CTA"-Block** ergänzen — als Hauptbestandteil direkt nach dem Begrüßungstext, vor den Bestelldetails.

## Änderung
Datei: `src/components/admin/preview/EmailPreview.tsx`

Neuer Block direkt nach dem `<p>vielen Dank…</p>`-Absatz, vor dem Bestelldetails-Block:

```text
┌────────────────────────────────────────────┐
│  📱  Lade die App, um deinen              │  ← accent-Hintergrund (sanft)
│      Liefertermin zu bestätigen            │     accent-Border links (4px)
│                                            │
│  Deine Bestellung wird erst versendet,     │
│  sobald du den Liefertermin in der App     │
│  bestätigt hast. Lade jetzt die            │
│  {shop_name} App herunter, um              │
│  fortzufahren.                             │
│                                            │
│  [  📲  App herunterladen  ]               │  ← accent-Button, href="#"
└────────────────────────────────────────────┘
```

### Inhalte (dynamisch)
- **Überschrift**: „Lade die App, um deinen Liefertermin zu bestätigen" (fest, Branding-Farbe)
- **Text**: „Deine Bestellung wird erst versendet, sobald du den Liefertermin in der App bestätigt hast. Lade jetzt die **{shop.shop_name}** App herunter, um fortzufahren." (Shop-Name dynamisch — nicht hardcoded „NovaShop")
- **Button**: „App herunterladen" — `href="#"`, accent-Farbe, breiter Block-Button mit Icon

### Styling
- Container: heller accent-Hintergrund (`${accent}10`), 4px accent-Border links, Padding 18px, Radius 8px
- Überschrift: 16px, fett, accent-Farbe
- Button: voll accent, weiße Schrift, zentriert, Padding 14px 32px, font-weight 600

## Bestehender CTA „Bestellung ansehen"
Bleibt unverändert weiter unten — der neue App-Block ist der **primäre** CTA oben, der bestehende bleibt sekundär.

## Keine weiteren Änderungen
Nur `EmailPreview.tsx` wird angepasst. Keine DB-, Routen- oder Shell-Änderungen.

