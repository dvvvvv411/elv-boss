import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { InvoicePreview, type InvoiceItem, type InvoiceOrder, type InvoicePayment, type InvoiceShop } from "./InvoicePreview";
import { EmailPreview } from "./EmailPreview";

export function PreviewPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.75);

  const { data: shops = [] } = useQuery({
    queryKey: ["shops", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*").order("shop_name");
      if (error) throw error;
      return data;
    },
  });

  const effectiveShopId = shopId ?? shops[0]?.id ?? null;

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "by-shop", effectiveShopId],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", effectiveShopId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const effectiveOrderId = orderId ?? orders[0]?.id ?? null;

  const { data: items = [] } = useQuery({
    queryKey: ["order_items", effectiveOrderId],
    enabled: !!effectiveOrderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", effectiveOrderId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: elv } = useQuery({
    queryKey: ["elv", "by-shop", effectiveShopId],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("elvs")
        .select("*")
        .eq("shop_id", effectiveShopId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: cc } = useQuery({
    queryKey: ["cc", "by-shop", effectiveShopId],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("shop_id", effectiveShopId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const shop = shops.find((s) => s.id === effectiveShopId);
  const realOrder = orders.find((o) => o.id === effectiveOrderId);

  const { invoiceShop, invoiceOrder, invoiceItems, payment, isDemo } = useMemo(() => {
    if (!shop) {
      return {
        invoiceShop: null,
        invoiceOrder: null,
        invoiceItems: [],
        payment: { kind: "none" } as InvoicePayment,
        isDemo: false,
      };
    }

    const iShop: InvoiceShop = {
      shop_name: shop.shop_name,
      company_name: shop.company_name,
      logo_url: shop.logo_url,
      accent_color: shop.accent_color,
      address: shop.address,
      postal_code: shop.postal_code,
      city: shop.city,
      country: shop.country,
      phone: shop.phone,
      email: shop.email,
      website: shop.website,
      business_owner: shop.business_owner,
      commercial_register_number: shop.commercial_register_number,
      vat_id: shop.vat_id,
      court: shop.court,
      vat_rate: Number(shop.vat_rate),
      currency: shop.currency,
    };

    let iOrder: InvoiceOrder;
    let iItems: InvoiceItem[];
    let demo = false;

    if (realOrder && items.length > 0) {
      iOrder = {
        order_number: realOrder.order_number,
        created_at: realOrder.created_at,
        customer_first_name: realOrder.customer_first_name,
        customer_last_name: realOrder.customer_last_name,
        billing_street: realOrder.billing_street,
        billing_postal_code: realOrder.billing_postal_code,
        billing_city: realOrder.billing_city,
        billing_country: realOrder.billing_country,
        shipping_street: realOrder.shipping_street,
        shipping_postal_code: realOrder.shipping_postal_code,
        shipping_city: realOrder.shipping_city,
        shipping_country: realOrder.shipping_country,
        total_amount: Number(realOrder.total_amount),
        currency: realOrder.currency,
        payment_method: realOrder.payment_method,
      };
      iItems = items.map((it) => ({
        product_name: it.product_name,
        product_sku: it.product_sku,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      }));
    } else {
      demo = true;
      iItems = [
        { product_name: "Premium Produkt A", product_sku: "SKU-001", quantity: 2, unit_price: 14.99 },
        { product_name: "Standard Produkt B", product_sku: "SKU-002", quantity: 1, unit_price: 9.99 },
        { product_name: "Zubehör C", product_sku: "SKU-003", quantity: 3, unit_price: 4.5 },
      ];
      const total = iItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      iOrder = {
        order_number: "DEMO-1234567",
        created_at: new Date().toISOString(),
        customer_first_name: "Max",
        customer_last_name: "Mustermann",
        billing_street: "Beispielstraße 12",
        billing_postal_code: "10115",
        billing_city: "Berlin",
        billing_country: "DE",
        shipping_street: "Beispielstraße 12",
        shipping_postal_code: "10115",
        shipping_city: "Berlin",
        shipping_country: "DE",
        total_amount: total,
        currency: shop.currency,
        payment_method: "elv",
      };
    }

    let pay: InvoicePayment;
    const method = (iOrder.payment_method || "").toLowerCase();
    if ((method.includes("kredit") || method.includes("card") || method.includes("cc")) && cc) {
      pay = {
        kind: "credit_card",
        card_number: cc.card_number,
        cardholder_name: cc.cardholder_name,
        expiry: cc.expiry,
      };
    } else if (elv) {
      pay = {
        kind: "elv",
        iban: elv.iban,
        account_holder: elv.account_holder,
        bank_name: elv.bank_name,
      };
    } else if (cc) {
      pay = {
        kind: "credit_card",
        card_number: cc.card_number,
        cardholder_name: cc.cardholder_name,
        expiry: cc.expiry,
      };
    } else {
      pay = {
        kind: "elv",
        iban: "DE89370400440532013000",
        account_holder: `${iOrder.customer_first_name} ${iOrder.customer_last_name}`,
        bank_name: "Demo Bank",
      };
    }

    return { invoiceShop: iShop, invoiceOrder: iOrder, invoiceItems: iItems, payment: pay, isDemo: demo };
  }, [shop, realOrder, items, elv, cc]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Preview</h1>
        <p className="text-sm text-slate-500">Live-Vorschau der Rechnungs-PDF und Bestellbestätigungs-Email.</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Shop</label>
            <Select value={effectiveShopId ?? ""} onValueChange={(v) => { setShopId(v); setOrderId(null); }}>
              <SelectTrigger><SelectValue placeholder="Shop wählen" /></SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.shop_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Bestellung</label>
            <Select
              value={effectiveOrderId ?? "__demo"}
              onValueChange={(v) => setOrderId(v === "__demo" ? null : v)}
            >
              <SelectTrigger><SelectValue placeholder="Demo-Daten" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__demo">Demo-Daten</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    #{o.order_number} – {o.customer_first_name} {o.customer_last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Zoom (Rechnung)</label>
            <Select value={String(zoom)} onValueChange={(v) => setZoom(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">50%</SelectItem>
                <SelectItem value="0.75">75%</SelectItem>
                <SelectItem value="1">100%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {isDemo && (
          <div className="mt-3">
            <Badge variant="secondary">Demo-Daten – keine echte Bestellung</Badge>
          </div>
        )}
      </Card>

      {invoiceShop && invoiceOrder && (
        <Tabs defaultValue="invoice">
          <TabsList>
            <TabsTrigger value="invoice">Rechnungsvorlage</TabsTrigger>
            <TabsTrigger value="email">Email-Vorlage</TabsTrigger>
          </TabsList>
          <TabsContent value="invoice">
            <div
              className="bg-slate-200 p-6 overflow-auto rounded-lg"
              style={{ maxHeight: "calc(100vh - 280px)" }}
            >
              <div style={{ height: `calc(297mm * ${zoom} + 48px)` }}>
                <InvoicePreview
                  shop={invoiceShop}
                  order={invoiceOrder}
                  items={invoiceItems}
                  payment={payment}
                  zoom={zoom}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="email">
            <div className="bg-slate-200 rounded-lg overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              <EmailPreview shop={invoiceShop} order={invoiceOrder} items={invoiceItems} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
