

## Ziel
Telefon, E-Mail-Konfiguration und SMS-Konfiguration auf `/admin/shops/new` (und `/edit`, da gleiche Form) klar als optional kennzeichnen.

## Befund
In `src/components/admin/ShopForm.tsx`:
- `phone`, `resend_api_key`, `sender_email`, `sender_name`, `sms_sender_name` sind im Zod-Schema bereits optional bzw. nicht required.
- `sender_email` hat aber `.email(...)` Validierung — schlägt fehl wenn leer? Nein, durch `.optional().or(z.literal(""))` ist leer erlaubt. ✅
- DB: `phone`, `resend_api_key`, `sender_email`, `sender_name`, `sms_sender_name` sind alle `Nullable: Yes` ✅

→ Technisch **sind sie bereits optional**. Es fehlt nur die visuelle Kennzeichnung im UI — Labels haben kein „(optional)" während Pflichtfelder ein `*` tragen. Der User denkt dadurch, sie seien erforderlich.

## Änderung
Nur Labels anpassen in `src/components/admin/ShopForm.tsx`:

| Feld | Alt | Neu |
|---|---|---|
| Telefon | `Telefon` | `Telefon (optional)` |
| Resend API Key | `Resend API Key` | `Resend API Key (optional)` |
| Absender E-Mail | `Absender E-Mail` | `Absender E-Mail (optional)` |
| Absender Name | `Absender Name` | `Absender Name (optional)` |
| SMS Absendername | `SMS Absendername` | `SMS Absendername (optional)` |

Zusätzlich: Section-Überschriften „E-Mail Konfiguration" → „E-Mail Konfiguration (optional)" und „SMS Konfiguration (seven.io)" → „SMS Konfiguration (optional)" für klare Gruppierung.

Keine Schema-, DB- oder Submit-Logik-Änderungen nötig — submit funktioniert bereits mit leeren Feldern.

## Ergebnis
User sieht sofort, dass Telefon und beide Konfigurationsblöcke leer gelassen werden können; Form lässt sich auch ohne diese Werte erfolgreich speichern.

