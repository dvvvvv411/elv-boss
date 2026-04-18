import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type OrderItem = {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderDetail = {
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
  billing_country: string;
  shipping_street: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
  shops: { shop_name: string; accent_color: string } | null;
};

export const Route = createFileRoute("/admin/orders/$id")({
  head: () => ({
    meta: [{ title: "Bestelldetails – ELV BOSS Admin" }],
  }),
  component: OrderDetailPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <AdminShell>
        <div className="p-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-2">Fehler</h2>
            <p className="text-sm text-slate-600 mb-4">{error.message}</p>
            <Button
              onClick={() => {
                router.invalidate();
                reset();
              }}
            >
              Erneut versuchen
            </Button>
          </Card>
        </div>
      </AdminShell>
    );
  },
  notFoundComponent: () => (
    <AdminShell>
      <div className="p-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-2">Bestellung nicht gefunden</h2>
          <Link to="/admin/orders">
            <Button>
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
          </Link>
        </Card>
      </div>
    </AdminShell>
  ),
});

function OrderDetailPage() {
  return (
    <AdminShell>
      <Toaster richColors position="top-center" />
      <OrderDetailContent />
    </AdminShell>
  );
}

function OrderDetailContent() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, shop_id, customer_first_name, customer_last_name, customer_email, customer_phone, billing_street, billing_postal_code, billing_city, billing_country, shipping_street, shipping_postal_code, shipping_city, shipping_country, total_amount, currency, payment_method, status, notes, created_at, order_items(id, product_name, product_sku, quantity, unit_price, line_total), shops(shop_name, accent_color)",
        )
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error("Fehler beim Laden", { description: error.message });
        setOrder(null);
      } else {
        setOrder(data as unknown as OrderDetail | null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-2">Bestellung nicht gefunden</h2>
          <Link to="/admin/orders">
            <Button>
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

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

  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: order.currency || "EUR",
    }).format(Number(n));

  const sameAddress =
    !order.shipping_street ||
    (order.shipping_street === order.billing_street &&
      order.shipping_postal_code === order.billing_postal_code &&
      order.shipping_city === order.billing_city);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-slate-400" />
              <span className="font-mono">#{order.order_number}</span>
            </h1>
            <p className="text-sm text-slate-500">
              {dStr} · {tStr}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={STATUS_STYLE[order.status]}>
          {STATUS_LABEL[order.status]}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Kunde
          </h2>
          <div className="space-y-1 text-sm">
            <div className="font-medium text-slate-900">
              {order.customer_first_name} {order.customer_last_name}
            </div>
            <div className="text-slate-700">{order.customer_email}</div>
            <div className="text-slate-700">{order.customer_phone ?? "–"}</div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Shop & Zahlung
          </h2>
          <div className="space-y-1 text-sm">
            {order.shops && (
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: order.shops.accent_color }}
                />
                <span className="font-medium text-slate-900">{order.shops.shop_name}</span>
              </div>
            )}
            <div className="text-slate-700">
              Zahlungsart: {order.payment_method ?? "–"}
            </div>
            <div className="text-slate-700">Währung: {order.currency}</div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Rechnungsadresse
          </h2>
          <div className="space-y-1 text-sm text-slate-700">
            <div>{order.billing_street}</div>
            <div>
              {order.billing_postal_code} {order.billing_city}
            </div>
            <div>{order.billing_country}</div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Lieferadresse
          </h2>
          {sameAddress ? (
            <p className="text-sm text-slate-500 italic">
              Identisch mit Rechnungsadresse
            </p>
          ) : (
            <div className="space-y-1 text-sm text-slate-700">
              <div>{order.shipping_street}</div>
              <div>
                {order.shipping_postal_code} {order.shipping_city}
              </div>
              <div>{order.shipping_country}</div>
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Warenkorb
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Produkt</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Menge</TableHead>
              <TableHead className="text-right">Einzelpreis</TableHead>
              <TableHead className="text-right">Summe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.order_items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                  Keine Positionen.
                </TableCell>
              </TableRow>
            ) : (
              order.order_items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium text-slate-900">
                    {it.product_name}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs font-mono">
                    {it.product_sku ?? "–"}
                  </TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(Number(it.unit_price))}</TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(Number(it.line_total))}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableCell colSpan={4} className="text-right font-semibold">
                Gesamt
              </TableCell>
              <TableCell className="text-right font-bold text-slate-900">
                {fmt(Number(order.total_amount))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {order.notes && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Notizen
          </h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
        </Card>
      )}
    </div>
  );
}
