
Fix: Login-Form soll vertikal mittig in der rechten Hälfte sitzen.

Aktuell nutzt die rechte `<section>` zwar `flex items-center justify-center`, aber die linke `<aside>` mit `min-h-screen` und `justify-between` (Header/Body/Footer) zwingt das Grid auf volle Höhe — die rechte Section sollte also eigentlich mittig sein. Wenn sie es nicht ist, liegt es daran, dass die Section selbst keine `min-h-screen` hat und im Grid die Höhe der `aside` erbt — das Form sitzt aber oben, weil der Inhalt kürzer ist als die Spalte.

Wahrscheinlichere Ursache: die `<section>` hat zwar `flex items-center justify-center`, aber durch das Grid mit `lg:grid-cols-2` streckt sie sich automatisch auf die Höhe der `aside`. Sollte mittig sein. Der User sieht es aber nicht mittig → vermutlich rendert auf 1143px Viewport noch das Mobile-Stacking (lg = 1024px, also greift lg:grid-cols-2). Form müsste mittig sein.

Fix-Ansatz: explizit `min-h-screen` auf die `<section>` setzen, damit auf jeden Fall vertikal zentriert wird, unabhängig vom Grid-Stretching.

Änderung in `src/routes/auth.tsx`:
- rechte `<section>`: `min-h-screen` ergänzen
- damit ist `flex items-center justify-center` garantiert wirksam und das Form sitzt sowohl horizontal als auch vertikal exakt mittig in der rechten Hälfte

Keine weiteren Änderungen. Auth-Logik, Branding-Panel und Responsive-Verhalten bleiben unangetastet.
