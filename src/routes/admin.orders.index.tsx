import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Search, ShoppingCart, RotateCcw } from "lucide-react";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { MultiSelectFilter } from "@/components/admin/MultiSelectFilter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BRAND = "#2ed573";

type OrderStatus =
  | "new"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunded";

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Neu",
  processing: "In Bearbeitung",
  shipped: "Versendet",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-emerald-100 text-emerald-700 border-emerald-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  shipped: "bg-indigo-100 text-indigo-700 border-indigo-200",
  completed: "bg-slate-200 text-slate-700 border-slate-300",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  refunded: "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABEL[s],
}));

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  shop_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string | null;
  billing_street: string;
  billing_postal_code: string;
  billing_city: string;
  shipping_street: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  status: OrderStatus;
  hidden: boolean;
  created_at: string;
  order_items: OrderItem[];
};

type ShopLite = {
  id: string;
  shop_name: string;
  accent_color: string;
};

export const Route = createFileRoute("/admin/orders/")({
  head: () => ({
    meta: [{ title: "Bestellungen – ELV BOSS Admin" }],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <AdminShell>
      <Toaster richColors position="top-center" />
      <OrdersContent />
    </AdminShell>
  );
}

function OrdersContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shops, setShops] = useState<ShopLite[]>([]);
  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [hideTarget, setHideTarget] = useState<OrderRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [ordersRes, shopsRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, shop_id, customer_first_name, customer_last_name, customer_email, customer_phone, billing_street, billing_postal_code, billing_city, shipping_street, shipping_postal_code, shipping_city, total_amount, currency, payment_method, status, hidden, created_at, order_items(id, product_name, quantity)",
        )
        .eq("hidden", false)
        .order("created_at", { ascending: false }),
      supabase.from("shops").select("id, shop_name, accent_color").order("shop_name"),
    ]);

    if (ordersRes.error) {
      toast.error("Bestellungen konnten nicht geladen werden", {
        description: ordersRes.error.message,
      });
      setOrders([]);
    } else {
      setOrders((ordersRes.data ?? []) as OrderRow[]);
    }

    if (shopsRes.error) {
      toast.error("Shops konnten nicht geladen werden");
      setShops([]);
    } else {
      setShops((shopsRes.data ?? []) as ShopLite[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const shopMap = useMemo(() => {
    const m = new Map<string, ShopLite>();
    shops.forEach((s) => m.set(s.id, s));
    return m;
  }, [shops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (shopFilter.length > 0 && !shopFilter.includes(o.shop_id)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(o.status)) return false;
      if (q) {
        const hay = [
          o.order_number,
          o.customer_first_name,
          o.customer_last_name,
          `${o.customer_first_name} ${o.customer_last_name}`,
          o.customer_email,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, shopFilter, statusFilter]);

  const hideOrder = async (order: OrderRow) => {
    const { error } = await supabase
      .from("orders")
      .update({ hidden: true })
      .eq("id", order.id);
    if (error) {
      toast.error("Ausblenden fehlgeschlagen", { description: error.message });
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    toast.success(`Bestellung #${order.order_number} ausgeblendet`);
    setHideTarget(null);
  };

  const reset = () => {
    setSearch("");
    setShopFilter([]);
    setStatusFilter([]);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" style={{ color: BRAND }} />
            Bestellungen
          </h1>
          <p className="text-sm text-slate-500">
            {loading ? "Wird geladen..." : `${filtered.length} von ${orders.length} angezeigt`}
          </p>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bestellnummer, Kunde oder Email suchen..."
            className="pl-9"
          />
        </div>
        <MultiSelectFilter
          options={shops.map((s) => ({ value: s.id, label: s.shop_name }))}
          selected={shopFilter}
          onChange={setShopFilter}
          placeholder="Shops"
          allLabel="Alle Shops"
          searchPlaceholder="Shop suchen..."
          emptyText="Keine Shops"
        />
        <MultiSelectFilter
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
          allLabel="Alle Status"
          searchPlaceholder="Status suchen..."
        />
        {(search || shopFilter.length > 0 || statusFilter.length > 0) && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Zurücksetzen
          </Button>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="whitespace-nowrap">Datum</TableHead>
                <TableHead className="whitespace-nowrap">Bestellnr.</TableHead>
                <TableHead className="whitespace-nowrap">Kunde</TableHead>
                <TableHead className="whitespace-nowrap">Telefon</TableHead>
                <TableHead className="whitespace-nowrap">Adresse</TableHead>
                <TableHead className="whitespace-nowrap">Abw.</TableHead>
                <TableHead className="whitespace-nowrap">Warenkorb</TableHead>
                <TableHead className="whitespace-nowrap text-right">Gesamt</TableHead>
                <TableHead className="whitespace-nowrap">Shop</TableHead>
                <TableHead className="whitespace-nowrap">Zahlungsart</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-slate-500">
                    {orders.length === 0
                      ? "Noch keine Bestellungen vorhanden."
                      : "Keine Bestellungen mit diesen Filtern."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <OrderRowView
                    key={o.id}
                    order={o}
                    shop={shopMap.get(o.shop_id)}
                    onOpen={() =>
                      navigate({ to: "/admin/orders/$id", params: { id: o.id } })
                    }
                    onHide={() => setHideTarget(o)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!hideTarget} onOpenChange={(o) => !o && setHideTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestellung ausblenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Bestellung #{hideTarget?.order_number} wird aus der Liste ausgeblendet. Sie
              bleibt in der Datenbank erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => hideTarget && hideOrder(hideTarget)}>
              Ausblenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrderRowView({
  order,
  shop,
  onOpen,
  onHide,
}: {
  order: OrderRow;
  shop: ShopLite | undefined;
  onOpen: () => void;
  onHide: () => void;
}) {
  const date = new Date(order.created_at);
  const dStr = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const tStr = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sameAddress =
    !order.shipping_street ||
    (order.shipping_street === order.billing_street &&
      order.shipping_postal_code === order.billing_postal_code &&
      order.shipping_city === order.billing_city);

  const total = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: order.currency || "EUR",
  }).format(Number(order.total_amount));

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap align-top">
        <div className="text-sm text-slate-900">{dStr}</div>
        <div className="text-xs text-slate-500">{tStr}</div>
      </TableCell>
      <TableCell className="align-top">
        <span className="font-mono text-sm font-medium text-slate-900">
          {order.order_number}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <div className="text-sm text-slate-900">
          {order.customer_first_name} {order.customer_last_name}
        </div>
        <div className="text-xs text-slate-500">{order.customer_email}</div>
      </TableCell>
      <TableCell className="align-top text-sm text-slate-700">
        {order.customer_phone ?? "–"}
      </TableCell>
      <TableCell className="align-top">
        <div className="text-sm text-slate-900">{order.billing_street}</div>
        <div className="text-xs text-slate-500">
          {order.billing_postal_code} {order.billing_city}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  sameAddress ? "bg-red-500" : "bg-emerald-500"
                }`}
                aria-label={sameAddress ? "Identisch" : "Abweichend"}
              />
            </TooltipTrigger>
            <TooltipContent>
              {sameAddress ? (
                <span>Lieferadresse identisch mit Rechnungsadresse</span>
              ) : (
                <div className="text-xs">
                  <div className="font-medium">Lieferadresse:</div>
                  <div>{order.shipping_street}</div>
                  <div>
                    {order.shipping_postal_code} {order.shipping_city}
                  </div>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="align-top min-w-[180px]">
        {order.order_items.length === 0 ? (
          <span className="text-xs text-slate-400">–</span>
        ) : (
          <div className="space-y-0.5">
            {order.order_items.map((it) => (
              <div key={it.id} className="text-xs text-slate-700">
                <span className="font-medium">{it.quantity}×</span> {it.product_name}
              </div>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top text-right whitespace-nowrap font-medium text-slate-900">
        {total}
      </TableCell>
      <TableCell className="align-top">
        {shop ? (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: shop.accent_color }}
            />
            <span className="text-sm text-slate-700 truncate">{shop.shop_name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">–</span>
        )}
      </TableCell>
      <TableCell className="align-top text-sm text-slate-700">
        {order.payment_method ?? "–"}
      </TableCell>
      <TableCell className="align-top">
        <Badge variant="outline" className={STATUS_STYLE[order.status]}>
          {STATUS_LABEL[order.status]}
        </Badge>
      </TableCell>
      <TableCell className="align-top text-right whitespace-nowrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpen}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Detailansicht</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onHide}>
                <EyeOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ausblenden</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}
