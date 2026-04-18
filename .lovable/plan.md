

## Ziel
Neuer `/admin/shops` Bereich mit Card-Übersicht, Edit/Delete und separater `/admin/shops/new` (sowie `/admin/shops/$id/edit`) Seite für Shop-Erstellung mit allen Feldern.

## Datenbank (neue Migration)

**Tabelle `shops`:**
- `id` uuid PK (gen_random_uuid)
- `owner_id` uuid (auth.uid – RLS scoping)
- Basis: `shop_name`, `company_name`, `email`, `phone`, `website`, `address`, `city`, `postal_code`, `country` (default 'DE'), `currency` (default 'EUR'), `language` (default 'de')
- Rechtlich: `vat_id`, `business_owner`, `court`, `commercial_register_number`, `vat_rate` (numeric, default 19)
- Email: `resend_api_key` (verschlüsselt/sensitiv), `sender_email`, `sender_name`
- SMS: `sms_sender_name`
- Branding: `logo_url`, `accent_color` (default '#2ed573')
- `created_at`, `updated_at`

**RLS:** Nur Admins (über bestehende `has_role(auth.uid(),'admin')`) können select/insert/update/delete.

**Storage Bucket:** `shop-logos` (public) für Logo-Uploads, mit RLS-Policy nur Admins dürfen schreiben.

**Sicherheitshinweis:** Resend API Key ist sensibel. Empfehlung in der Umsetzung: als Text speichern, aber RLS auf Admin-only beschränken (kein Edge-Secret-Management pro Shop nötig laut Anforderung).

## Routing (TanStack Start, flat dot-naming)

Neue Route-Files:
- `src/routes/admin.shops.tsx` – Card-Liste + "Shop hinzufügen" Button
- `src/routes/admin.shops.new.tsx` – Erstell-Formular
- `src/routes/admin.shops.$id.edit.tsx` – Bearbeiten-Formular

Bestehende `src/routes/admin.tsx` bleibt Dashboard. Im Sidebar-Menü neuen Eintrag „Shops" ergänzen, der via `<Link to="/admin/shops">` navigiert. Active-State über `useLocation` ableiten statt hardcoded `active:true`.

## UI-Aufbau

**`/admin/shops` (Übersicht):**
- Gleicher SidebarProvider/Topbar-Frame wie `admin.tsx` (Layout-Code in kleines `AdminShell`-Component extrahieren und in beiden Seiten nutzen, damit kein Copy-Paste-Drift)
- Header mit Titel + grünem "Shop hinzufügen" Button → `/admin/shops/new`
- Grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` mit Shop-Cards
- Card pro Shop:
  - Logo (oder Initiale-Avatar) + Shop-Name + Firmenname
  - Shop-ID Zeile mit Copy-Button (Clipboard API + Toast „ID kopiert")
  - Email/Stadt als Sekundärinfo
  - Footer: „Bearbeiten" (→ edit route) + „Löschen" (AlertDialog Bestätigung)
- Empty-State wenn keine Shops vorhanden
- Loading-Skeleton während Fetch

**`/admin/shops/new` & `/admin/shops/$id/edit`:**
- Formular in logischen Sektionen (Cards):
  1. Allgemein (Shopname, Firma, Email, Telefon, Website)
  2. Adresse (Straße, Stadt, PLZ, Land/Währung/Sprache als Selects mit nur jeweils einer Option)
  3. Rechtliches (USt-ID, Inhaber, Amtsgericht, HRB, MwSt-Satz)
  4. Email-Konfiguration (Resend Key als password-Input, Absender-Email, Absender-Name)
  5. SMS-Konfiguration (SMS Absendername)
  6. Branding (Logo Upload + Vorschau, Akzentfarbe als `<input type="color">` neben Hex-Feld)
- "Speichern" + "Abbrechen" Buttons unten
- Validierung mit Zod (Email-Format, Pflichtfelder, MwSt 0–100, Hex-Color Regex)

## Daten-Layer
- Direktnutzung des bestehenden Browser-Clients `@/integrations/supabase/client` in den Routen (CRUD via `supabase.from('shops')`).
- Logo-Upload via `supabase.storage.from('shop-logos').upload(...)`, dann `getPublicUrl` und in `logo_url` speichern.
- Auth-Check pro Seite analog `admin.tsx` (Redirect wenn nicht eingeloggt).

## Technische Details
- Neue Files:
  - `supabase/migrations/<timestamp>_create_shops.sql`
  - `src/components/admin/AdminShell.tsx` (Sidebar + Topbar wiederverwendbar, Menüitems mit aktiver Route via `useLocation`)
  - `src/components/admin/ShopForm.tsx` (geteilt zwischen new/edit)
  - `src/routes/admin.shops.tsx`, `src/routes/admin.shops.new.tsx`, `src/routes/admin.shops.$id.edit.tsx`
- `src/routes/admin.tsx` refactor: nutzt `AdminShell`, entfernt Duplikat-Code
- Toaster: `sonner` (bereits installiert)
- Keine neuen npm-Dependencies nötig

## Ergebnis
- Sidebar zeigt „Shops" mit korrekter Active-Markierung
- `/admin/shops` listet alle Shops als Cards mit Copy-ID, Edit, Delete
- „Shop hinzufügen" → eigene Seite mit allen geforderten Feldern, Land/Währung/Sprache als Single-Option-Dropdowns, Logo-Upload und Color-Picker
- Bearbeiten nutzt dieselbe Form-Komponente, vorausgefüllt
- Alles RLS-geschützt auf Admin-Rolle

