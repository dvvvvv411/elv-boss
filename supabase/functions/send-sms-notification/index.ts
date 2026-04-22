// SMS-Benachrichtigung via seven.io
// - Produktiv: { order_id } -> sendet Dank-SMS an Kundenrufnummer
// - Test:      { test: true, phone, shop_id } -> sendet Test-SMS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";
import { normalizeDePhone } from "../_shared/phone.ts";

const SEVEN_IO_URL = "https://gateway.seven.io/api/sms";

function buildOrderText(opts: {
  firstName: string;
  orderNumber: string;
  shopName: string;
}) {
  return (
    `Hallo ${opts.firstName}, vielen Dank für Ihre Bestellung #${opts.orderNumber} bei ${opts.shopName}!\n\n` +
    `Den Download-Link für unsere App finden Sie in Ihrer Bestellbestätigung per E-Mail. Über die App können Sie Ihren Liefertermin wählen.\n\n` +
    `Ihr ${opts.shopName}-Team`
  );
}

async function sendSeven(opts: {
  apiKey: string;
  to: string;
  text: string;
  from?: string | null;
}) {
  const body: Record<string, unknown> = { to: opts.to, text: opts.text };
  if (opts.from && opts.from.trim()) body.from = opts.from.trim();

  const resp = await fetch(SEVEN_IO_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": opts.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await resp.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // seven.io liefert manchmal Text
  }
  return { ok: resp.ok, status: resp.status, raw, data };
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

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SEVEN_IO_API_KEY = Deno.env.get("SEVEN_IO_API_KEY");

    const body = await req.json().catch(() => ({}));
    const isTest = body?.test === true;

    // Auth-Check (außer Test-Modus)
    if (!isTest) {
      const auth = req.headers.get("authorization") || "";
      const expected = `Bearer ${SERVICE_ROLE_KEY}`;
      if (auth !== expected) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: jsonHeaders,
        });
      }
    }

    if (!SEVEN_IO_API_KEY) {
      console.warn("SEVEN_IO_API_KEY fehlt – SMS wird übersprungen");
      return new Response(JSON.stringify({ skipped: "no_api_key" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ---------- TEST-MODUS ----------
    if (isTest) {
      const phoneRaw = String(body.phone ?? "");
      const shopId = String(body.shop_id ?? "");
      if (!phoneRaw || !shopId) {
        return new Response(
          JSON.stringify({ error: "phone und shop_id erforderlich" }),
          { status: 400, headers: jsonHeaders }
        );
      }
      const to = normalizeDePhone(phoneRaw);
      if (!to) {
        return new Response(
          JSON.stringify({ error: "Ungültige Telefonnummer" }),
          { status: 400, headers: jsonHeaders }
        );
      }
      const { data: shop } = await supabase
        .from("shops")
        .select("shop_name, sms_sender_name")
        .eq("id", shopId)
        .maybeSingle();

      const sender = shop?.sms_sender_name ?? null;
      const shopName = shop?.shop_name ?? "Shop";
      const text = `Test-SMS von ${sender || shopName} via seven.io ✓`;

      const r = await sendSeven({ apiKey: SEVEN_IO_API_KEY, to, text, from: sender });
      console.log("seven.io test response", r.status, r.raw);
      if (!r.ok) {
        return new Response(
          JSON.stringify({ error: "seven.io Fehler", status: r.status, body: r.raw }),
          { status: 500, headers: jsonHeaders }
        );
      }
      return new Response(
        JSON.stringify({ success: true, to, response: r.data ?? r.raw }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // ---------- PRODUKTIV-MODUS ----------
    const orderId = String(body.order_id ?? "");
    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id erforderlich" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("customer_first_name, customer_phone, order_number, shop_id")
      .eq("id", orderId)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order nicht gefunden" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (!order.customer_phone) {
      console.log("SMS skip: keine Telefonnummer", { orderId });
      return new Response(JSON.stringify({ skipped: "no_phone" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const to = normalizeDePhone(order.customer_phone);
    if (!to) {
      console.warn("SMS skip: ungültige Telefonnummer", {
        orderId,
        raw: order.customer_phone,
      });
      return new Response(JSON.stringify({ skipped: "invalid_phone" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("shop_name, sms_sender_name")
      .eq("id", order.shop_id)
      .maybeSingle();

    const shopName = shop?.shop_name ?? "Shop";
    const sender = shop?.sms_sender_name ?? null;

    const text = buildOrderText({
      firstName: order.customer_first_name,
      orderNumber: order.order_number,
      shopName,
    });

    const r = await sendSeven({ apiKey: SEVEN_IO_API_KEY, to, text, from: sender });
    console.log("seven.io order response", r.status, r.raw);
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: "seven.io Fehler", status: r.status, body: r.raw }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, to, response: r.data ?? r.raw }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error("send-sms-notification error", e);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String((e as Error).message ?? e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
