
## ELV BOSS – Landing Page

**Ziel:** Eine einzige Full-Screen Hero Section, helles Theme, seriös, minimalistisch.

### Struktur
- **Eine Route:** `src/routes/index.tsx` (Placeholder ersetzen)
- **Keine weiteren Sektionen, kein Header, kein Footer** – nur Hero, 100vh

### Design
- **Theme:** Hell (weißer Hintergrund mit subtilen Akzenten)
- **Brandfarbe:** `#2ed573` (frisches Grün – als Akzent, nicht dominant, um Seriosität zu wahren)
- **Typografie:** Große, klare Sans-Serif-Headline „ELV BOSS" – fett, elegantes Letter-Spacing
- **Untertitel:** Eine subtile, kurze Tagline (z. B. „Die Gelddruckmaschine") – dezent in Muted-Foreground
- **Less is more:** Nur Headline + minimaler Untertitel mittig zentriert

### Background-Effekt (subtil & seriös)
- Sehr leichter, animierter **Gradient-Mesh** mit zwei sanft pulsierenden grünen Glow-Orbs (blurred, niedrige Opacity) im Hintergrund
- Feines **Grid-Pattern** als Overlay (sehr dezent, ~5% Opacity) für tech/seriösen Look
- Sanfte, langsame Bewegung – nicht ablenkend

### Animationen
- **Headline „ELV BOSS":** Buchstaben-für-Buchstaben Fade-in mit leichtem Upward-Slide (gestaffelt, ~80 ms Delay pro Buchstabe)
- **Untertitel:** Verzögertes Fade-in nach Headline
- **Hintergrund-Orbs:** Langsame, kontinuierliche Pulse/Float-Animation
- **Akzentlinie unter Headline:** Animiert in die Breite (scale-x von 0 → 1) in Brandfarbe

### Technische Umsetzung
- Tailwind + Inline-Style für `#2ed573`
- CSS-Keyframes für Letter-Animation, Float und Pulse direkt in `src/styles.css`
- Update `__root.tsx` Meta: Title „ELV BOSS", passende Description

