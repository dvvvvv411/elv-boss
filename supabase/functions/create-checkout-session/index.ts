// Public edge function: Shop-Frontend creates a checkout session.
// No auth, no JWT — fully public.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";

const BodySchema = z.object({
  brandingId: z.string().uuid(),
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(500),
        gross_price: z.number().min(0),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  shipping_cost: z.number().min(0).default(0),
});

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
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: jsonHeaders }
      );
    }
    const { brandingId, products, shipping_cost } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify shop exists
    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .select("id")
      .eq("id", brandingId)
      .maybeSingle();
    if (shopErr) throw shopErr;
    if (!shop) {
      return new Response(JSON.stringify({ error: "Shop not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // Server-side total calculation
    const itemsTotal = products.reduce(
      (sum, p) => sum + p.gross_price * p.quantity,
      0
    );
    const total_amount = Math.round((itemsTotal + shipping_cost) * 100) / 100;

    const { data: session, error: insErr } = await supabase
      .from("checkout_sessions")
      .insert({
        shop_id: brandingId,
        products,
        shipping_cost,
        total_amount,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ checkout_token: session.id }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error("create-checkout-session error", e);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String((e as Error).message ?? e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
