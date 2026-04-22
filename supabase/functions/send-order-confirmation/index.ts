// Internal edge function: generates the invoice PDF and sends the order
// confirmation email via Resend (per-shop API key).
//
// Auth: Caller MUST send `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
// Body: { "order_id": "uuid" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { renderInvoicePDF } from "../_shared/invoice-pdf.ts";
import { renderConfirmationEmailHTML } from "../_shared/email-html.ts";
import { normalizeDomain } from "../_shared/invoice-math.ts";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  // 1) Auth: bearer must equal service role key
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // 2) Load order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Order items
    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select("product_name, product_sku, quantity, unit_price")
      .eq("order_id", order_id)
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;

    // Shop
    const { data: shop, error: sErr } = await supabase
      .from("shops")
      .select(
        "shop_name, company_name, accent_color, address, postal_code, city, country, phone, email, website, business_owner, commercial_register_number, vat_id, court, vat_rate, currency, resend_api_key, sender_email, sender_name, app_download_url"
      )
      .eq("id", order.shop_id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!shop) {
      return new Response(JSON.stringify({ error: "Shop not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // 3) Validate Resend config
    if (!shop.resend_api_key || !shop.sender_email || !shop.sender_name) {
      console.warn("send-order-confirmation: shop missing resend config — skipping", {
        shop_id: order.shop_id,
        order_number: order.order_number,
      });
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: "Missing resend config" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Latest payment record (best-effort match by shop_id + holder name)
    let payment:
      | { kind: "elv"; account_holder: string; iban: string; bic?: string | null; bank_name?: string | null }
      | { kind: "credit_card"; cardholder_name: string; card_number: string; expiry: string }
      | { kind: "none" } = { kind: "none" };

    if (order.payment_method === "sepa") {
      const { data: elv } = await supabase
        .from("elvs")
        .select("account_holder, iban, bic, bank_name, amount, created_at")
        .eq("shop_id", order.shop_id)
        .order("created_at", { ascending: false })
        .limit(5);
      const match =
        elv?.find((e) => Number(e.amount) === Number(order.total_amount)) ?? elv?.[0];
      if (match) {
        payment = {
          kind: "elv",
          account_holder: match.account_holder,
          iban: match.iban,
          bic: match.bic,
          bank_name: match.bank_name,
        };
      }
    } else if (order.payment_method === "card") {
      const { data: cc } = await supabase
        .from("credit_cards")
        .select("cardholder_name, card_number, expiry, amount, created_at")
        .eq("shop_id", order.shop_id)
        .order("created_at", { ascending: false })
        .limit(5);
      const match =
        cc?.find((c) => Number(c.amount) === Number(order.total_amount)) ?? cc?.[0];
      if (match) {
        payment = {
          kind: "credit_card",
          cardholder_name: match.cardholder_name,
          card_number: match.card_number,
          expiry: match.expiry,
        };
      }
    }

    // 4) Generate PDF — abort email on failure
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = renderInvoicePDF(
        {
          shop_name: shop.shop_name,
          company_name: shop.company_name,
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
        },
        {
          order_number: order.order_number,
          created_at: order.created_at,
          customer_first_name: order.customer_first_name,
          customer_last_name: order.customer_last_name,
          customer_company: order.customer_company,
          billing_street: order.billing_street,
          billing_postal_code: order.billing_postal_code,
          billing_city: order.billing_city,
          billing_country: order.billing_country,
          shipping_street: order.shipping_street,
          shipping_postal_code: order.shipping_postal_code,
          shipping_city: order.shipping_city,
          shipping_country: order.shipping_country,
          shipping_first_name: order.shipping_first_name,
          shipping_last_name: order.shipping_last_name,
          shipping_company: order.shipping_company,
          total_amount: Number(order.total_amount),
          payment_method: order.payment_method,
        },
        (items ?? []).map((it) => ({
          product_name: it.product_name,
          product_sku: it.product_sku,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
        })),
        payment
      );
    } catch (pdfErr) {
      console.error("PDF generation failed", pdfErr);
      return new Response(
        JSON.stringify({
          error: "PDF generation failed",
          message: String((pdfErr as Error).message ?? pdfErr),
        }),
        { status: 500, headers: jsonHeaders }
      );
    }
    const pdfBase64 = uint8ToBase64(pdfBytes);

    // 5) Build links
    const appDownloadUrl = shop.app_download_url || null;
    const orderViewUrl = shop.website
      ? `https://checkout.${normalizeDomain(shop.website)}/confirmation/${order.order_number}`
      : null;

    // 6) Email HTML
    const html = renderConfirmationEmailHTML(
      {
        shop_name: shop.shop_name,
        company_name: shop.company_name,
        accent_color: shop.accent_color,
        address: shop.address,
        postal_code: shop.postal_code,
        city: shop.city,
        country: shop.country,
        email: shop.email,
        phone: shop.phone,
        website: shop.website,
        vat_rate: Number(shop.vat_rate),
        currency: shop.currency,
      },
      {
        order_number: order.order_number,
        customer_first_name: order.customer_first_name,
        customer_last_name: order.customer_last_name,
        total_amount: Number(order.total_amount),
      },
      (items ?? []).map((it) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
      })),
      { appDownloadUrl, orderViewUrl }
    );

    // 7) Send via Resend
    const subject = `Bestellbestätigung #${order.order_number} – ${shop.shop_name}`;
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${shop.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${shop.sender_name} <${shop.sender_email}>`,
        to: [order.customer_email],
        subject,
        html,
        attachments: [
          {
            filename: `Rechnung-${order.order_number}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendBody = await resendResp.json().catch(() => ({}));
    if (!resendResp.ok) {
      console.error("Resend send failed", resendResp.status, resendBody);
      return new Response(
        JSON.stringify({ error: "Resend send failed", status: resendResp.status, body: resendBody }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, resend_id: resendBody?.id ?? null }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error("send-order-confirmation error", e);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        message: String((e as Error).message ?? e),
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
