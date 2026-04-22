

## Ziel
BIC und Bankname automatisch aus der IBAN ableiten und in `elvs` speichern, sobald eine Lastschrift-Bestellung über `submit-order` reinkommt.

## API-Wahl: openiban.com
- **Kostenlos**, kein API-Key, kein Account
- Endpoint: `GET https://openiban.com/validate/{IBAN}?getBIC=true&validateBankCode=true`
- Liefert JSON: `{ valid, bankData: { bic, name, ... } }`
- iban-rechner.de selbst hat keine kostenlose API (nur die kostenpflichtige iban-bic.com Profi-Version mit API-Key) — openiban deckt deutsche Banken vollständig ab und ist die etablierte Free-Alternative.

> Falls du bewusst die kostenpflichtige iban-bic.com API willst, sag Bescheid — dann brauchen wir einen API-Key als Secret.

## Änderungen

### 1. `supabase/functions/submit-order/index.ts`
Im SEPA-Branch (vor dem `elvs.insert`):
- `fetch` an `https://openiban.com/validate/{normalisierteIBAN}?getBIC=true&validateBankCode=true`
- Felder ziehen: `bankData.bic`, `bankData.name`
- Bei Erfolg → mit in `elvs` Insert schreiben
- Bei Fehler/Timeout (5s) oder ungültigem Response → `bic = null`, `bank_name = null` (Bestellung darf NICHT scheitern, Felder sind in DB ohnehin nullable)
- Try/catch um den Lookup, Fehler nur loggen

### 2. `supabase/functions/_shared/invoice-pdf.ts`
Zahlungs-Box bei SEPA erweitern: zusätzlich BIC + Bankname anzeigen, wenn vorhanden.

### 3. `supabase/functions/send-order-confirmation/index.ts`
Beim Laden der jüngsten `elvs`-Zeile auch `bic` + `bank_name` mitselektieren und an `renderInvoicePDF` durchreichen.

## Keine Änderungen
- `elvs`-Tabelle (Felder `bic`, `bank_name` existieren bereits, sind nullable)
- `/admin/elvs` (zeigt die Felder bereits an)
- Kein neuer Secret, keine Migration

## Verhaltens-Matrix
| Szenario | Verhalten |
|---|---|
| openiban liefert BIC+Name | gespeichert, in PDF angezeigt |
| openiban Timeout/down/ungültige IBAN | `bic`/`bank_name` = null, Bestellung trotzdem erfolgreich, Log-Warn |
| Nicht-deutsche IBAN ohne BIC-Daten | `bic`/`bank_name` = null |

