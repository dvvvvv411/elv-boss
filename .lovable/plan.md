

## Problem
1. **CORS-Preflight blockiert** — `Access-Control-Allow-Headers` in `_shared/cors.ts` erlaubt nur `Content-Type`, aber `supabase.functions.invoke()` sendet zusätzlich `authorization`, `apikey`, `x-client-info`. Browser bricht mit "Failed to fetch" ab, bevor die Function überhaupt läuft.
2. **Auth-Mismatch beim Test-Button** — Function verlangt `Bearer SERVICE_ROLE_KEY`, der Browser sendet aber das User-JWT. Selbst nach CORS-Fix → 401.

## Fix

### 1. `supabase/functions/_shared/cors.ts`
`Access-Control-Allow-Headers` erweitern:
```
"authorization, x-client-info, apikey, content-type"
```
Betrifft alle Functions, ist aber in jeder anderen Function bereits implizit nötig — schadet nichts.

### 2. `supabase/functions/send-telegram-notification/index.ts`
Auth-Logik aufteilen:
- **Test-Modus** (`{ test: true }`): Akzeptiere normales User-JWT (kein Service-Role-Check). Rationale: Aufruf kommt aus dem Admin-UI, ist durch RLS/Login geschützt.
- **Produktiv-Modus** (`{ order_id }`): Service-Role-Bearer weiterhin Pflicht (Aufruf nur von `submit-order` intern).

Konkret: Service-Role-Check nur ausführen, wenn Body **kein** `test: true` enthält.

### 3. OPTIONS-Response
Sicherstellen, dass der Preflight (`OPTIONS`) bereits die erweiterten Header zurückliefert — durch Fix in `_shared/cors.ts` automatisch erledigt, da die Function `corsHeaders` für 204-OPTIONS verwendet.

## Geänderte Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/_shared/cors.ts` | `Allow-Headers` erweitern |
| `supabase/functions/send-telegram-notification/index.ts` | Service-Role-Check nur im Nicht-Test-Modus |

Keine DB-Migration, keine neuen Secrets, keine Frontend-Änderung.

