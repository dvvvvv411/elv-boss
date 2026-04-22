

## Probleme
1. **Footer „schwebt" mitten in der Seite** — `renderInvoicePDF` zeichnet den Footer direkt nach dem Content (`y += ...`), nicht am Seitenende. → Footer muss **immer am unteren Seitenrand jeder Seite** sitzen (echter PDF-Footer).
2. **SKU-Spalte überflüssig** — sowohl in PDF (`invoice-pdf.ts`) als auch in Preview (`InvoicePreview.tsx`).
3. **Vermerk „Kostenloser Versand"** fehlt in der PDF (ist nur im Email-Template). Soll auch im PDF + Preview erscheinen.

---

## Lösung

### 1. Echter PDF-Footer (fix unten)
In `supabase/functions/_shared/invoice-pdf.ts`:

- **Neue Funktion `drawFooter(doc, shop, accent, pageW, margin)`** — zeichnet Accent-Linie + 4-Spalten-Footer (Unternehmen / Kontakt / Rechtliches / Hinweise) **immer bei fester Y-Position** am Seitenende:
  - Footer-Höhe ≈ 30 mm, Start bei `y = 297 - 30 = 267 mm`
  - Accent-Linie bei `y = 267`
  - Spalten-Text darunter
- **Footer wird auf jeder Seite gezeichnet** — am Ende über alle `doc.internal.pages` iterieren und `drawFooter()` aufrufen.
- **Content-Bereich begrenzen**: Page-Break-Schwelle von `y > 250/260` runter auf `y > 250` (gibt Footer Platz). Konstante `CONTENT_MAX_Y = 255` einführen, alle `if (y > XXX) addPage()` darauf umstellen.
- **Bisherigen Footer-Block am Ende entfernen** (wird durch globalen Footer ersetzt).
- Optional: Seitenzahl „Seite X / Y" rechts neben Footer-Linie.

### 2. SKU-Spalte entfernen

**`supabase/functions/_shared/invoice-pdf.ts`:**
- `cols.sku` raus
- Spalten neu verteilen (mehr Platz für `desc`):
  - `pos` (8) | `desc` (~92) | `qty` (12) | `vat` (14) | `unit` (22) | `line` (25)
- Header-`text("SKU"...)` und Daten-`text(it.product_sku...)` entfernen
- `cols.desc.w` auf ~88 mm erhöhen (für `splitTextToSize`)

**`src/components/admin/preview/InvoicePreview.tsx`:**
- `<th>SKU</th>` und `<td>{it.product_sku || "—"}</td>` entfernen
- Spaltenbreiten anpassen (Beschreibung breiter)

### 3. „Kostenloser Versand"-Vermerk

**Direkt unter den Items, vor den Totals**, in beiden Templates:
- Text: **„Versandkosten: Kostenlos"** (rechtsbündig, gleiche Schriftgröße wie Subtotal-Zeile)
- Eingefügt in Totals-Block als erste Zeile vor „Zwischensumme (netto)":
  ```
  Versand                      Kostenlos
  Zwischensumme (netto)        XX,XX €
  MwSt 19%                     X,XX €
  ──────────────────────
  GESAMT                       XX,XX €
  ```

**`invoice-pdf.ts`:** Eine zusätzliche Zeile im Totals-Block (`doc.text("Versand", ...)` + `doc.text("Kostenlos", ..., {align: "right"})`).

**`InvoicePreview.tsx`:** Eine zusätzliche `<div>`-Zeile im Totals-Container vor „Zwischensumme".

---

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/_shared/invoice-pdf.ts` | Footer fix unten + auf jeder Seite, SKU-Spalte raus, „Versand: Kostenlos" Zeile |
| `src/components/admin/preview/InvoicePreview.tsx` | SKU-Spalte raus, „Versand: Kostenlos" Zeile |

Keine DB-Migration, keine neuen Secrets, kein Frontend-Build-Impact außer Preview.

---

## QA nach Implementierung
1. Edge Function `generate-invoice` (oder die, die `renderInvoicePDF` nutzt) deployen
2. Test-Bestellung → PDF rendern → mit `pdftoppm` in JPG umwandeln → Seiten visuell prüfen:
   - Footer am unteren Rand jeder Seite
   - Keine SKU-Spalte mehr
   - „Versand: Kostenlos" sichtbar
   - Kein Überlappen von Content und Footer
3. Falls Items >1 Seite: Footer auf beiden Seiten kontrollieren

