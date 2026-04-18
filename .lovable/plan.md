

## Ziel
Neuer Reiter `/admin/orders` mit Tabellenansicht, Suche/Filtern, Aktionen und Detailseite `/admin/orders/$id`. Bestellnummern sind 7-stellige Zufallszahlen.

## DB-Migration

**Enum** `order_status`: `new`, `processing`, `shipped`, `completed`, `cancelled`, `refunded`.

**Tabelle `orders`**:
- `id uuid pk`, `order_number text unique not null` (7-stellig, per Default-Funktion)
- `shop_id uuid not null references shops(id) on delete cascade`
- Kunde: `customer_first_name`, `customer_last_name`, `customer_email`, `customer_phone`
- Rechnung: `billing_street`, `billing_postal_code`, `billing_city`, `billing_country`
- Liefer: `shipping_street`, `shipping_postal_code`, `shipping_city`, `shipping_country` (nullable)
- `total_amount numeric(12,2) default 0`, `currency text default 'EUR'`
- `payment_method text`, `status order_status default 'new'`
- `hidden boolean default false`, `notes text`
- `created_at`, `updated_at` (Trigger `set_updated_at`)

**Tabelle `order_items`**:
- `id`, `order_id` (fk cascade), `product_name`, `product_sku`, `quantity int`, `unit_price numeric(12,2)`, `line_total numeric(12,2)`, `created_at`

**Order-Number-Funktion**:
```sql
create or replace function public.generate_order_number()
returns text language plpgsql as $$
declare candidate text; attempts int := 0;
begin
  loop
    candidate := lpad(floor(random()*9000000 + 1000000)::text, 7, '0');
    exit when not exists (select 1 from public.orders where order_number = candidate);
    attempts := attempts + 1;
    if attempts > 10 then raise exception 'Could not generate unique order_number'; end if;
  end loop;
  return candidate;
end; $$;
```
`order_number` bekommt `default generate_order_number()`.

**RLS**: Beide Tabellen — alle Aktionen nur für `has_role(auth.uid(),'admin')`.
**Indizes**: `orders(shop_id)`, `orders(status)`, `orders(created_at desc)`, `orders(hidden)`, `order_items(order_id)`.

## Routen (Flat-Dot)
- `src/routes/admin.orders.tsx` — Layout mit `<Outlet />`
- `src/routes/admin.orders.index.tsx` — Tabellenansicht
- `src/routes/admin.orders.$id.tsx` — Detailseite

## UI `/admin/orders`

**Toolbar**: Suchleiste (Bestellnr./Kunde/Email), Shop-Multiselect (Default alle), Status-Multiselect (Default alle), Reset-Button.

**Tabelle** (shadcn `Table`, horizontal scrollbar):

| Spalte | Inhalt |
|---|---|
| Datum | Z1 `dd.MM.yyyy` · Z2 `HH:mm` (xs muted) |
| Bestellnr. | `order_number` (mono) |
| Kunde | Z1 Name · Z2 Email |
| Telefon | `customer_phone` oder `–` |
| Adresse | Z1 Straße · Z2 PLZ Stadt |
| Abw. | Punkt: rot=identisch, grün=abweichend (Tooltip mit Lieferadresse) |
| Warenkorb | je item eine Zeile `2× Produktname` |
| Gesamt | formatiert mit Currency |
| Shop | Name + Akzentpunkt |
| Zahlungsart | `payment_method` |
| Status | Badge (vorerst nur „Neu" grün) |
| Aktionen | Icon `Eye` (Detail), Icon `EyeOff` (Ausblenden mit Confirm) |

`hidden=true` wird nicht angezeigt. Filtern/Suche clientseitig.

## UI `/admin/orders/$id`
Cards: Header (`#1234567`, Status, Datum, Zurück), Kunde, Rechnungs-/Lieferadresse (oder „identisch"), Shop, Zahlung, Warenkorb-Tabelle mit Summe, Notizen. `errorComponent` + `notFoundComponent`.

## Sidebar
In `AdminShell.tsx` neuer aktiver Eintrag nach „Shops":
```ts
{ title: "Bestellungen", icon: ShoppingCart, to: "/admin/orders" }
```

## Komponente
`src/components/admin/MultiSelectFilter.tsx` — wiederverwendbar (Popover + Command + Checkbox).

## Keine Dummy-Daten
Liste startet leer; nur reale DB-Daten.

