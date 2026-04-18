

## Problem
Identisches Routing-Problem wie bei `admin.tsx` zuvor. Im Flat-Dot-Routing ist `admin.shops.tsx` der **Parent** von `admin.shops.new.tsx` und `admin.shops.$id.edit.tsx` (siehe `routeTree.gen.ts`: `AdminShopsNewRoute … getParentRoute: () => AdminShopsRoute`).

`admin.shops.tsx` rendert aktuell aber direkt die Card-Liste statt einen `<Outlet />` — daher zeigt `/admin/shops/new` weiterhin die Card-Liste der Parent-Route.

## Lösung
Gleiche Variante wie bei admin: Liste auf eigene Index-Route umziehen.

1. **`src/routes/admin.shops.tsx`** → reduzieren auf Layout-Route:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/admin/shops")({
     component: () => <Outlet />,
   });
   ```

2. **`src/routes/admin.shops.index.tsx`** (neu) → bisheriger Inhalt von `admin.shops.tsx` (ShopsPage + ShopsContent, Imports, Konstanten), Route = `createFileRoute("/admin/shops/")`.

3. `admin.shops.new.tsx` und `admin.shops.$id.edit.tsx` bleiben unverändert — rendern jetzt korrekt im Outlet.

4. `routeTree.gen.ts` regeneriert sich automatisch.

## Ergebnis
- `/admin/shops` → Card-Liste
- `/admin/shops/new` → Erstell-Formular
- `/admin/shops/:id/edit` → Bearbeiten-Formular

