

## Problem
Die Custom Domain `panel.antpiregmbh.de` wird vom Vite-Dev-Server blockiert, weil sie nicht in `server.allowedHosts` eingetragen ist. Standardmäßig erlaubt Vite nur bekannte Hosts aus Sicherheitsgründen (Schutz vor DNS-Rebinding).

## Lösung
In `vite.config.ts` die Custom Domain zu `server.allowedHosts` hinzufügen. Das Lovable-Preset (`@lovable.dev/vite-tanstack-config`) erlaubt zusätzliche Vite-Optionen über das `vite`-Feld in `defineConfig`.

## Änderung

**Datei:** `vite.config.ts`

Erweitern um:
```ts
export default defineConfig({
  vite: {
    server: {
      allowedHosts: ["panel.antpiregmbh.de"],
    },
  },
});
```

Das Preset bleibt aktiv (alle bestehenden Plugins/Aliases unverändert), nur die Allow-List wird ergänzt.

## Ergebnis
Der Dev-/Preview-Server akzeptiert Anfragen über `panel.antpiregmbh.de`, die Blockade-Meldung verschwindet. Keine weiteren Auswirkungen auf Build, Routing oder Edge Functions.

