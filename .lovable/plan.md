
Ziel: `/auth` komplett neu als sauberes, stabiles 1/2-Layout aufbauen — optisch angelehnt an die offizielle Lovable-Loginseite, aber mit deiner gewünschten Anordnung: links Branding/Trust auf Grün, rechts Login/Register auf Weiß.

1. Neuaufbau statt Flickwerk
- `src/routes/auth.tsx` vollständig neu strukturieren
- bestehende Auth-Logik behalten: `useAuth`, Redirect nach `/admin`, `signInWithPassword`, `signUp`, Toasts, Validierung
- Fokus nur auf Layout und UI-Struktur, damit keine alten Styling-Konflikte mitgeschleppt werden

2. Layout-Prinzip
- outer wrapper bleibt ein echtes `grid grid-cols-1 lg:grid-cols-2`
- Desktop: exakt 50/50, volle Höhe
- linke Hälfte = grünes Branding-Panel
- rechte Hälfte = weißes Auth-Panel
- keine inneren Layouts, die wieder wie 4 Teilflächen wirken

3. Linke Hälfte neu
- Vollfläche mit `#2ed573`
- ruhiger Aufbau in einer einzigen vertikalen Spalte
- oben nur kleiner Zurück-Link
- mittig:
  - „ELV BOSS“
  - Unterzeile „Die Gelddruckmaschine“
- darunter 3–4 Trust-Elemente als einfache vertikale Liste
- keine Karten-Grid-Struktur, keine harten Borders, keine extra Panels
- optional sehr subtile Hintergrund-Glows, aber nur dekorativ und ohne Segmentierung

4. Rechte Hälfte neu
- ein einziger zentrierter Auth-Container mit klarer Max-Breite
- visuell an der offiziellen Lovable-Seite orientiert:
  - klare Headline
  - kurze Beschreibung
  - kompakter Umschalter für Login / Registrieren
  - darunter jeweils genau ein Formularblock
- Inputs und Button full width
- saubere Abstände, keine zusätzlichen Untercontainer, die wie eigene Bereiche aussehen

5. Tabs/Form-Verhalten
- `Tabs` weiterverwenden, aber im Auth-Container bewusst schlicht einsetzen
- falls die vorhandenen Tabs zu „kastig“ wirken, nur leichte Stilkorrektur in `src/components/ui/tabs.tsx`
- Formulare bleiben funktional unverändert, nur visuell sauberer gruppiert

6. Responsive Verhalten
- Mobile: zuerst kompakter grüner Brand-Bereich, direkt darunter das Formular
- Trust-Liste auf Mobile kürzer/kompakter, damit der Login schnell sichtbar ist
- keine Zwischenzustände mit versetzten Quadranten oder merkwürdiger Schwerpunktverteilung

7. Orientierung an der offiziellen Lovable-Loginseite
- übernehmen:
  - klare 2-Spalten-Logik
  - ruhige Flächen
  - ein zentraler Formularbereich
  - minimale visuelle Komplexität
- nicht übernehmen:
  - Seitenvertauschung
  - Lovable-Farben/Branding
- stattdessen:
  - Lovable-Strukturprinzip rechts/links sauber adaptiert
  - dein ELV-BOSS-Branding links in Grün

Technische Umsetzung
- Datei: `src/routes/auth.tsx`
  - Page-Layout komplett vereinfachen
  - linke Spalte auf `flex flex-col`
  - Trust-Items als einfache Liste rendern
  - rechte Spalte mit genau einem `max-w` Auth-Container
- optional: `src/components/ui/tabs.tsx`
  - nur kleine optische Entschlackung, falls nötig
- keine Änderungen an Supabase-Client, `useAuth`, Redirect-Logik oder Formularvalidierung

Ergebnis nach Umsetzung
- links genau ein grünes Panel mit Branding + Trust
- rechts genau ein weißes Panel mit Login/Register
- keine 4-Bereiche-Optik mehr
- optisch klarer, stabiler und näher an der offiziellen Lovable-Loginstruktur
