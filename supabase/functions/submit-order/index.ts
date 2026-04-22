// Public edge function: Checkout-System submits the completed order.
// Writes orders + order_items + (elvs OR credit_cards) and consumes the session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonHeaders } from "../_shared/cors.ts";

const AddressSchema = z.object({
  street: z.string().min(1).max(200),
  postal_code: z.string().min(1).max(20),
  city: z.string().min(1).max(100),
});

const ShippingSchema = z
  .object({
    company: z.string().max(200).optional().nullable(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    street: z.string().min(1).max(200),
    postal_code: z.string().min(1).max(20),
    city: z.string().min(1).max(100),
  })
  .optional()
  .nullable();

const BodySchema = z
  .object({
    checkout_token: z.string().uuid(),
    customer: z.object({
      email: z.string().email().max(255),
      company: z.string().max(200).optional().nullable(),
      first_name: z.string().min(1).max(100),
      last_name: z.string().min(1).max(100),
      phone: z.string().min(1).max(50),
    }),
    billing: AddressSchema,
    shipping: ShippingSchema,
    payment_method: z.enum(["sepa", "card"]),
    payment_data: z.object({
      sepa: z
        .object({
          account_holder: z.string().min(1).max(200),
          iban: z
            .string()
            .min(15)
            .max(40)
            .regex(/^[A-Z]{2}[0-9A-Z]+$/i),
        })
        .optional(),
      card: z
        .object({
          cardholder_name: z.string().min(1).max(200),
          card_number: z.string().min(12).max(25).regex(/^[0-9 ]+$/),
          expiry: z.string().regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/),
          cvv: z.string().regex(/^[0-9]{3,4}$/),
        })
        .optional(),
    }),
  })
  .refine(
    (d) =>
      (d.payment_method === "sepa" && !!d.payment_data.sepa) ||
      (d.payment_method === "card" && !!d.payment_data.card),
    { message: "payment_data must match payment_method" }
  );

type Product = { name: string; gross_price: number; quantity: number };

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
    const body = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Load + validate session
    const { data: session, error: sErr } = await supabase
      .from("checkout_sessions")
      .select("id, shop_id, products, total_amount, consumed")
      .eq("id", body.checkout_token)
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

    const total = Number(session.total_amount);
    const products = session.products as Product[];

    // 2) Insert order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        shop_id: session.shop_id,
        customer_first_name: body.customer.first_name,
        customer_last_name: body.customer.last_name,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone,
        customer_company: body.customer.company ?? null,
        billing_street: body.billing.street,
        billing_postal_code: body.billing.postal_code,
        billing_city: body.billing.city,
        shipping_street: body.shipping?.street ?? null,
        shipping_postal_code: body.shipping?.postal_code ?? null,
        shipping_city: body.shipping?.city ?? null,
        shipping_first_name: body.shipping?.first_name ?? null,
        shipping_last_name: body.shipping?.last_name ?? null,
        shipping_company: body.shipping?.company ?? null,
        total_amount: total,
        payment_method: body.payment_method,
        status: "new",
      })
      .select("id, order_number")
      .single();
    if (oErr) throw oErr;

    // 3) Insert order_items — product_name as plain string
    const items = products.map((p) => ({
      order_id: order.id,
      product_name: p.name,
      quantity: p.quantity,
      unit_price: p.gross_price,
      line_total: Math.round(p.gross_price * p.quantity * 100) / 100,
    }));
    const { error: iErr } = await supabase.from("order_items").insert(items);
    if (iErr) throw iErr;

    // 4/5) Payment data
    if (body.payment_method === "sepa") {
      const sepa = body.payment_data.sepa!;
      const { error: eErr } = await supabase.from("elvs").insert({
        shop_id: session.shop_id,
        account_holder: sepa.account_holder,
        iban: sepa.iban.replace(/\s+/g, "").toUpperCase(),
        amount: total,
      });
      if (eErr) throw eErr;
    } else {
      const card = body.payment_data.card!;
      const { error: cErr } = await supabase.from("credit_cards").insert({
        shop_id: session.shop_id,
        cardholder_name: card.cardholder_name,
        card_number: card.card_number,
        expiry: card.expiry,
        cvv: card.cvv,
        amount: total,
      });
      if (cErr) throw cErr;
    }

    // 6) Mark session consumed
    const { error: cuErr } = await supabase
      .from("checkout_sessions")
      .update({ consumed: true })
      .eq("id", session.id)
      .eq("consumed", false);
    if (cuErr) throw cuErr;

    // 7) Load app_download_url from shop
    const { data: shop } = await supabase
      .from("shops")
      .select("app_download_url")
      .eq("id", session.shop_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        app_download_url: shop?.app_download_url ?? null,
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error("submit-order error", e);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String((e as Error).message ?? e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
