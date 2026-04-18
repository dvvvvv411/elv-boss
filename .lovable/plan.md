
Ziel: Die `/auth` Seite auf ein echtes, klares 1/2-Layout zurückbauen. Der aktuelle Eindruck von „4 Bereichen“ kommt nicht vom Outer-Layout, sondern von den inneren Grids/Karten, die die linke Hälfte optisch zerschneiden.

1. Ursache beheben
- `src/routes/auth.tsx` prüfen und die linke Hälfte vereinfachen:
  - aktuelles Outer-Layout `lg:grid-cols-2` beibehalten
  - innerhalb der linken Hälfte das Trust-Grid `sm:grid-cols-2` entfernen
  - statt 4 Karten in Rasterform: eine vertikale, ruhige Liste oder 2-3 kompakte Trust-Elemente untereinander
- rechte Hälfte klar als ein zusammenhängender Login/Register-Bereich gestalten, nicht wie mehrere Blöcke

2. Linke Hälfte neu strukturieren
- Vollflächiger grüner Bereich `#2ed573`
- oben optional nur kleiner Zurück-Link
- mittig: großes „ELV BOSS“, Unterzeile „Die Gelddruckmaschine“
- darunter: Trust-/Money-Elemente als einspaltige Liste, damit die linke Seite wie eine einzige Fläche wirkt
- weniger Boxen, weniger Borders, weniger Segmentierung

3. Rechte Hälfte neu strukturieren
- weiße Hälfte mit einem einzigen zentrierten Auth-Container
- Headline + kurze Beschreibung
- Tabs nur als Umschalter, aber restlich alles in einem sauberen Block
- Inputs und Button full width, klare Abstände
- visuell keine Unterteilung in zusätzliche „Panels“

4. Responsive Verhalten schärfen
- Desktop: strikt 50/50
- Mobile: erst Brand-Bereich kompakt oben, dann Form darunter
- keine Zwischenzustände, die wie mehrere Spalten oder Quadranten wirken

5. Technische Änderungen
- `src/routes/auth.tsx`:
  - linkes internes `grid` entfernen bzw. auf `flex flex-col` umstellen
  - Trust-Elemente auf vertikale Liste umbauen
  - Spacing und max widths so anpassen, dass jede Hälfte als eine Fläche gelesen wird
- optional kleine Stilkorrekturen an `src/components/ui/tabs.tsx` nur wenn die Tabs selbst zu „kastig“ wirken; sonst unverändert lassen

6. Ergebnis nach Umsetzung
- links exakt ein grünes Branding-Panel
- rechts exakt ein weißes Auth-Panel
- kein Eindruck mehr von 4 Teilflächen
- weiterhin Login/Register, Redirects und Supabase-Logik unverändert

Technische Details
- Ursache im aktuellen Code:
  - Outer-Layout: `grid grid-cols-1 lg:grid-cols-2` ist korrekt
  - Problemstelle: `trustItems` wird in `className="mt-10 grid grid-cols-1 sm:grid-cols-2 ..."` gerendert
  - dadurch entstehen links 4 stark getrennte Karten
- Fix:
  - `sm:grid-cols-2` entfernen
  - Kartenstil deutlich reduzieren oder durch einfache Zeilenliste ersetzen
  - rechte Seite als ein einziger Card-/Container-Bereich mit klarer Mitte aufbauen
