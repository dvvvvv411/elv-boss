
Ziel: `/auth` so korrigieren, dass die Seite als ein einziges fullscreen 1/2-Layout erscheint: links grüne Fläche mit Trust-Inhalten, rechts weißes Login/Register-Panel, beide gleichzeitig im selben Viewport.

Befund:
- Der eigentliche Layout-Bug sitzt nicht am `grid-cols-2`.
- In `src/routes/auth.tsx` steht `<Toaster />` direkt innerhalb von `<main className="grid ... lg:grid-cols-2">`.
- Dadurch ist der Toaster selbst ein zusätzliches Grid-Item.
- Bei 2 Spalten autoplaced das Grid dann:
  - Grid-Item 1: Toaster
  - Grid-Item 2: linkes Panel
  - Grid-Item 3: rechtes Panel
- Ergebnis: Die sichtbaren Panels landen nicht nebeneinander, sondern in unterschiedlichen Grid-Zellen/Zeilen. Genau daher wirkt es wie „oben eins, unten eins“ statt ein gemeinsames fullscreen Bild.

Umsetzung:
1. `src/routes/auth.tsx` bereinigen
- `<Toaster />` aus dem Grid-Flow entfernen.
- Entweder vor/nach `<main>` rendern oder in einen absolut/fixed unabhängigen Wrapper setzen.
- Wichtig: Im 2-Spalten-Grid dürfen nur noch genau 2 direkte Kinder liegen:
  - `<aside>` links
  - `<section>` rechts

2. Layout hart vereinfachen
- `main`: `min-h-screen grid grid-cols-1 lg:grid-cols-2`
- `aside`: linke Hälfte, grün, volle Höhe
- `section`: rechte Hälfte, volle Höhe, `flex items-center justify-center`
- keine weiteren direkten Grid-Kinder

3. Zentrierung rechts absichern
- rechte `section` bei `min-h-screen` belassen
- inneren Auth-Container mit fixer Max-Breite mittig halten
- so bleibt Login/Register vertikal und horizontal zentriert

4. Keine Logikänderungen
- `useAuth`, Redirect nach `/admin`, `signInWithPassword`, `signUp`, Zod-Validierung und Toast-Meldungen bleiben unverändert
- nur Struktur/Layout wird korrigiert

Ergebnis nach Fix:
- Beide Hälften sind gleichzeitig fullscreen sichtbar
- links volle grüne Hälfte
- rechts volle weiße Hälfte mit mittigem Formular
- kein Split in obere/untere Bereiche mehr
- keine „4-Quadranten“-Optik mehr
