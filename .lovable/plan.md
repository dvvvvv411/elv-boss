

## Problem
Mit Flat-Dot-Routing macht TanStack `admin.shops.tsx` zu einem **Child** von `admin.tsx`. Damit das Child gerendert wird, muss der Parent `admin.tsx` einen `<Outlet />` rendern. Aktuell rendert `admin.tsx` aber direkt das Dashboard — egal welche `/admin/*` URL aufgerufen wird, es kommt immer das Dashboard.

Beweis aus `routeTree.gen.ts`:
```
AdminShopsRoute … getParentRoute: () => AdminRoute
```
→ `admin.shops` ist verschachtelt unter `admin`.

## Lösung
Routing entkoppeln, sodass `/admin` (Dashboard) und `/admin/shops` (Liste) eigenständige Seiten sind, nicht Parent/Child.

**Variante A (sauber, gewählt):** Dashboard auf eigene Index-Route umziehen.
- `src/routes/admin.tsx` wird zur **Layout-Route**, die nur `<Outlet />` rendert (kein UI/AdminShell hier nötig, weil jede Seite ihren eigenen `AdminShell` hat).
- Neue Datei `src/routes/admin.index.tsx` enthält das bisherige Dashboard-UI (`AdminPage` + `DashboardContent`, Konstanten, Imports).
- `admin.shops.tsx`, `admin.shops.new.tsx`, `admin.shops.$id.edit.tsx` bleiben unverändert — sie rendern jetzt korrekt im Outlet.

## Änderungen
1. `src/routes/admin.tsx` → minimal:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/admin")({ component: () => <Outlet /> });
   ```
2. `src/routes/admin.index.tsx` (neu) → bisheriger Inhalt von `admin.tsx` (Dashboard mit `AdminShell` + `DashboardContent`), Route = `createFileRoute("/admin/")`.
3. `routeTree.gen.ts` regeneriert sich automatisch.

## Ergebnis
- `/admin` zeigt Dashboard
- `/admin/shops` zeigt Shops-Card-Liste
- `/admin/shops/new` und `/admin/shops/$id/edit` funktionieren wie vorgesehen

