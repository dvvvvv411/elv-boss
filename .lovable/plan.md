

## Problem
Konsole: `No QueryClient set, use QueryClientProvider to set one`. Das Projekt nutzt `@tanstack/react-query` (in `admin.orders.index.tsx`, `admin.elvs.index.tsx`, `admin.kreditkarten.index.tsx`), aber **es existiert nirgends ein `QueryClientProvider`**. `/admin/orders` ist nur zufällig nicht abgestürzt, weil noch nicht gerendert/geklickt — die Seiten brechen alle ab, sobald `useQuery` läuft.

## Fix

**1. `src/router.tsx`** — `QueryClient` pro Router-Instanz erstellen und in den Router-Context geben (kein Modul-Singleton wegen SSR).

```ts
import { QueryClient } from "@tanstack/react-query";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });
  return router;
};
```

**2. `src/routes/__root.tsx`** — auf `createRootRouteWithContext<{ queryClient: QueryClient }>()` umstellen und `RootComponent` mit `QueryClientProvider` umhüllen.

```tsx
import { createRootRouteWithContext } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  /* head, shellComponent, notFoundComponent unverändert */
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

Keine weiteren Dateiänderungen nötig — die bestehenden `useQuery`-Aufrufe in den Admin-Seiten funktionieren danach automatisch.

## Ergebnis
`/admin/elvs` und `/admin/kreditkarten` (und `/admin/orders`) laden ohne „Something went wrong".

