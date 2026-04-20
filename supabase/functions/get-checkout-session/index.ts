// Public edge function: Checkout-System fetches branding + order data via token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";

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
    const token = url.searchParams.get("token");
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return new Response(JSON.stringify({ error: "Invalid or missing token" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session, error: sErr } = await supabase
      .from("checkout_sessions")
      .select("shop_id, products, shipping_cost, total_amount, consumed")
      .eq("id", token)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }
    if (session.consumed) {
      return new Response(JSON.stringify({ error: "Session already used" }), {
        status: 410,
        headers: jsonHeaders,
      });
    }

    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .select("company_name, logo_url, vat_rate, currency")
      .eq("id", session.shop_id)
      .maybeSingle();
    if (shopErr) throw shopErr;
    if (!shop) {
      return new Response(JSON.stringify({ error: "Shop not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        branding: {
          company_name: shop.company_name,
          logo_url: shop.logo_url,
          vat_rate: Number(shop.vat_rate) / 100, // 19 → 0.19
        },
        products: session.products,
        shipping_cost: Number(session.shipping_cost),
        total_amount: Number(session.total_amount),
        currency: shop.currency ?? "EUR",
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error("get-checkout-session error", e);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String((e as Error).message ?? e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
