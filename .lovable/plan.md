

## Ziel
Shop-Logos in der Card-Liste auf `/admin/shops` ihrer natürlichen rechteckigen Form anzeigen, statt sie in ein 56×56 Quadrat zu pressen.

## Befund
In `src/routes/admin.shops.index.tsx` (ca. Zeile 154–160):
```tsx
<img className="h-14 w-14 rounded-xl object-cover ..." />
```
- Fixe Quadrat-Box (`h-14 w-14`) + `object-cover` schneidet rechteckige Logos zu / verzerrt visuell.
- Initial-Avatar-Fallback (ohne Logo) bleibt sinnvoll quadratisch.

## Änderung (nur `src/routes/admin.shops.index.tsx`)

**Logo-Container:** feste Höhe, flexible Breite, `object-contain` damit das ganze Logo ohne Crop sichtbar ist.

```tsx
<div
  className="h-12 w-auto max-w-[140px] flex items-center shrink-0"
  style={{ borderLeft: `3px solid ${shop.accent_color}25`, paddingLeft: 8 }}
>
  <img
    src={shop.logo_url}
    alt={shop.shop_name}
    className="h-12 w-auto max-w-[132px] object-contain"
  />
</div>
```

Konkret:
- Höhe fix `h-12` (48px) → einheitliche Card-Zeile
- Breite `w-auto` mit `max-w-[140px]` → Logo behält Seitenverhältnis, wird nicht zu breit
- `object-contain` statt `object-cover` → kein Zuschnitt
- Kein Hintergrund/Border/Shadow mehr ums Logo (Akzentfarbe ist bereits über den linken Card-Balken sichtbar) → wirkt sauberer für transparente PNG-Logos

**Initial-Avatar-Fallback (kein Logo):** bleibt quadratisch `h-12 w-12 rounded-xl` mit Akzentfarbe als Hintergrund — ändert sich nur in der Größe von 56→48px, damit beide Varianten gleich hoch sind.

**Keine weiteren Änderungen.**

## Ergebnis
Rechteckige Shop-Logos werden in voller Breite und ohne Zuschnitt angezeigt; quadratische funktionieren weiterhin; Initial-Avatare (Shops ohne Logo) bleiben als saubere quadratische Tiles erhalten.

