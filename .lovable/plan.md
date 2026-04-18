

## Ziel
Zwei neue Admin-Reiter `/admin/elvs` und `/admin/kreditkarten` — exakt mit den vom User vorgegebenen Spalten, ohne Extras.

## DB-Migration

**Tabelle `elvs`**
- `id uuid pk`
- `shop_id uuid not null references shops(id) on delete cascade`
- `account_holder text not null`
- `iban text not null`
- `bic text`
- `bank_name text`
- `amount numeric(12,2) not null default 0`
- `created_at`, `updated_at` (Trigger `set_updated_at`)

**Tabelle `credit_cards`**
- `id uuid pk`
- `shop_id uuid not null references shops(id) on delete cascade`
- `cardholder_name text not null`
- `card_number text not null` (Klartext, Demo)
- `expiry text not null` (Format `MM/YY`, z.B. `12/27`)
- `cvv text not null`
- `amount numeric(12,2) not null default 0`
- `created_at`, `updated_at` (Trigger `set_updated_at`)

**RLS** beide Tabellen: SELECT/INSERT/UPDATE/DELETE nur für `has_role(auth.uid(),'admin')`.
**Indizes**: jeweils `(shop_id)`, `(created_at desc)`.

## Routen (Flat-Dot)
- `src/routes/admin.elvs.tsx` — Layout `<Outlet />`
- `src/routes/admin.elvs.index.tsx` — Tabelle
- `src/routes/admin.kreditkarten.tsx` — Layout `<Outlet />`
- `src/routes/admin.kreditkarten.index.tsx` — Tabelle

## UI `/admin/elvs`

**Toolbar**: Suchleiste (filtert über `account_holder` und `iban`).

**Tabelle**:
| Spalte | Inhalt |
|---|---|
| Kontoinhaber | `account_holder` |
| IBAN | `iban` (mono) |
| BIC | `bic` oder `–` |
| Bankname | `bank_name` oder `–` |
| Betrag | `amount` |
| Shop | Shop-Name + Akzentpunkt |

## UI `/admin/kreditkarten`

**Toolbar**: Suchleiste (filtert über `cardholder_name` und `card_number`).

**Tabelle**:
| Spalte | Inhalt |
|---|---|
| Name | `cardholder_name` |
| Kreditkartennummer | `card_number` (mono) |
| Ablaufdatum | `expiry` (z.B. `12/27`) |
| CVV | `cvv` (mono) |
| Betrag | `amount` |
| Shop | Shop-Name + Akzentpunkt |

## Sidebar
In `AdminShell.tsx` nach „Bestellungen":
```ts
{ title: "ELVs", icon: Landmark, to: "/admin/elvs" }
{ title: "Kreditkarten", icon: CreditCard, to: "/admin/kreditkarten" }
```

## Keine Dummy-Daten
Beide Listen starten leer; nur reale DB-Daten.

