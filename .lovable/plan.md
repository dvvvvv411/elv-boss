

## Ziel
Auf `/admin/shops` jede Shop-Card als volle Zeile (full width, eine pro Reihe) darstellen und das Card-Layout deutlich aufwerten.

## Befund
Aktuell in `src/routes/admin.shops.index.tsx`:
- Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` → 3 Spalten auf Desktop
- Card vertikal aufgebaut (Logo oben, Infos darunter, Buttons unten)
- ID-Box, Aktionen alles untereinander gestapelt

## Änderungen (nur `src/routes/admin.shops.index.tsx`)

**1. Layout: einspaltig**
- Grid → `flex flex-col gap-3` (eine Card pro Zeile, full width)
- Skeleton-Block ebenfalls auf einspaltig anpassen (3 Skeletons à `h-28`)

**2. Card-Redesign (horizontales Layout)**
Neue Struktur in einer Reihe:

```text
┌───────────────────────────────────────────────────────────────────────┐
│ [Logo]  Shopname              ID: a1b2-… [copy]    [Edit]  [Delete]  │
│  56px   Firmenname • Stadt                                            │
│         ✉ email@x.de  ☎ +49…  🌐 website.de                          │
└───────────────────────────────────────────────────────────────────────┘
```

Konkret:
- Container: `flex items-center gap-5 p-5` mit `hover:shadow-md transition-shadow`, dezenter linker Akzentbalken in `shop.accent_color` (`border-l-4`)
- **Links**: Logo/Initial-Avatar 56×56, abgerundet, mit Ring in Akzentfarbe
- **Mitte (flex-1)**:
  - Zeile 1: `shop_name` (font-semibold, text-base) + kleine Badge mit Stadt (falls vorhanden)
  - Zeile 2: `company_name` (text-sm text-slate-500)
  - Zeile 3: Inline-Meta mit Icons (`Mail`, `Phone`, `Globe` aus lucide) — nur anzeigen wenn vorhanden, mit `gap-4 text-xs text-slate-600`, truncate
- **ID-Block**: kompakter Pill `bg-slate-50 border rounded-md px-2 py-1`, monospace ID gekürzt (`{id.slice(0,8)}…{id.slice(-4)}`), Copy-Button daneben (Tooltip „ID kopieren") — kopiert weiterhin volle ID
- **Aktionen**: `Edit`-Button (outline, mit Icon+Text) und `Delete`-Icon-Button (ghost, rose hover) rechtsbündig

**3. Empty State / Header** bleiben unverändert.

**4. Responsive**
- Auf Mobile (`<sm`): Layout wechselt zu `flex-col items-start`, ID-Block und Aktionen rutschen unter die Infos (via `flex-wrap` + `sm:flex-nowrap`).

## Keine weiteren Änderungen
- Keine neuen Dateien, kein Schema-/DB-Touch.
- Icons `Mail`, `Phone`, `Globe` zusätzlich aus `lucide-react` importieren (bereits Dependency).

## Ergebnis
Übersichtliche, scanbare Liste — eine Card pro Zeile, volle Breite, klar gegliedert mit Akzentfarben-Indikator, kompakter Kopier-Pill und gut erreichbaren Aktionen rechts.

