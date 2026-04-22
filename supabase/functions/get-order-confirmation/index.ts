// Public edge function: returns full confirmation payload for the checkout
// confirmation page, looked up by order_number (7-digit string).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";

function detectBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (!d) return "Unknown";
  const c = d[0];
  if (c === "4") return "Visa";
  if (c === "5") return "Mastercard";
  if (c === "3") return "Amex";
  if (c === "6") return "Discover";
  return "Unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get("order_number");
    if (!orderNumber || !/^\d{7}$/.test(orderNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid order_number" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select(
        "id, order_number, shop_id, customer_email, customer_first_name, customer_last_name, customer_company, customer_phone, billing_street, billing_postal_code, billing_city, shipping_street, shipping_postal_code, shipping_city, shipping_first_name, shipping_last_name, shipping_company, total_amount, currency, payment_method"
      )
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // 2) Items + 3) Shop in parallel
    const [itemsRes, shopRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("product_name, unit_price, quantity, line_total")
        .eq("order_id", order.id),
      supabase
        .from("shops")
        .select("company_name, logo_url, vat_rate, app_download_url")
        .eq("id", order.shop_id)
        .maybeSingle(),
    ]);
    if (itemsRes.error) throw itemsRes.error;
    if (shopRes.error) throw shopRes.error;

    const items = itemsRes.data ?? [];
    const shop = shopRes.data;

    // 4) Payment data (latest match by shop + holder name)
    let payment: Record<string, unknown> = { method: order.payment_method };
    if (order.payment_method === "sepa") {
      const holder = `${order.customer_first_name} ${order.customer_last_name}`;
      const { data: elv } = await supabase
        .from("elvs")
        .select("account_holder, iban")
        .eq("shop_id", order.shop_id)
        .eq("account_holder", holder)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (elv) {
        const iban = String(elv.iban).replace(/\s+/g, "").toUpperCase();
        payment.sepa = {
          account_holder: elv.account_holder,
          iban_last4: iban.slice(-4),
          iban_country: iban.slice(0, 2),
        };
      }
    } else if (order.payment_method === "card") {
      const holder = `${order.customer_first_name} ${order.customer_last_name}`;
      const { data: card } = await supabase
        .from("credit_cards")
        .select("cardholder_name, card_number, expiry")
        .eq("shop_id", order.shop_id)
        .eq("cardholder_name", holder)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (card) {
        const digits = String(card.card_number).replace(/\D/g, "");
        payment.card = {
          cardholder: card.cardholder_name,
          brand: detectBrand(digits),
          last4: digits.slice(-4),
          expiry: card.expiry,
        };
      }
    }

    // shipping object — only if any shipping field is present
    const hasShipping =
      !!order.shipping_street ||
      !!order.shipping_postal_code ||
      !!order.shipping_city ||
      !!order.shipping_first_name ||
      !!order.shipping_last_name ||
      !!order.shipping_company;

    const total = Number(order.total_amount);
    const lineSum =
      Math.round(
        items.reduce((s, it) => s + Number(it.line_total ?? 0), 0) * 100
      ) / 100;
    const shippingCost = Math.max(0, Math.round((total - lineSum) * 100) / 100);

    const body = {
      order_number: order.order_number,
      app_download_url: shop?.app_download_url ?? null,
      customer: {
        email: order.customer_email,
        first_name: order.customer_first_name,
        last_name: order.customer_last_name,
        company: order.customer_company,
        phone: order.customer_phone,
      },
      billing: {
        street: order.billing_street,
        postal_code: order.billing_postal_code,
        city: order.billing_city,
      },
      shipping: hasShipping
        ? {
            company: order.shipping_company,
            first_name: order.shipping_first_name,
            last_name: order.shipping_last_name,
            street: order.shipping_street,
            postal_code: order.shipping_postal_code,
            city: order.shipping_city,
          }
        : null,
      payment,
      session: {
        branding: {
          company_name: shop?.company_name ?? null,
          logo_url: shop?.logo_url ?? null,
          vat_rate: shop ? Number(shop.vat_rate) / 100 : null,
        },
        products: items.map((it) => ({
          name: it.product_name,
          gross_price: Number(it.unit_price),
          quantity: it.quantity,
        })),
        shipping_cost: shippingCost,
        total_amount: total,
        currency: order.currency || "EUR",
      },
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("get-order-confirmation error", e);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        message: String((e as Error).message ?? e),
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
