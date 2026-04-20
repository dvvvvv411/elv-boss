import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, preflight } from "@/lib/cors";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SubmitSchema } from "@/lib/checkout-validation";
import { verifyToken } from "@/lib/checkout-token";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const Route = createFileRoute("/api/checkout/submit")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
          }

          const parsed = SubmitSchema.safeParse(body);
          if (!parsed.success) {
            return jsonResponse(
              { error: "Validation failed", issues: parsed.error.flatten() },
              400,
            );
          }
          const input = parsed.data;

          const tokenResult = await verifyToken(input.checkout_token);
          if (!tokenResult.ok) {
            if (tokenResult.reason === "expired") {
              return jsonResponse({ error: "Token expired" }, 410);
            }
            return jsonResponse({ error: "Invalid token" }, 401);
          }
          const tp = tokenResult.payload;

          // Address mapping: shipping = customer; billing = override or customer
          const shipping = input.customer;
          const billing =
            input.use_different_billing && input.billing_address
              ? input.billing_address
              : input.customer;

          // Insert order
          const { data: order, error: orderErr } = await supabaseAdmin
            .from("orders")
            .insert({
              shop_id: tp.branding_id,
              status: "new",
              total_amount: tp.total_amount,
              payment_method: input.payment_method,
              customer_email: input.customer.email,
              customer_first_name: input.customer.first_name,
              customer_last_name: input.customer.last_name,
              customer_phone: input.customer.phone ?? null,
              billing_street: billing.street,
              billing_postal_code: billing.postal_code,
              billing_city: billing.city,
              billing_country: billing.country,
              shipping_street: shipping.street,
              shipping_postal_code: shipping.postal_code,
              shipping_city: shipping.city,
              shipping_country: shipping.country,
            })
            .select("id, order_number")
            .single();

          if (orderErr || !order) {
            console.error("Order insert error:", orderErr);
            return jsonResponse({ error: "Failed to create order" }, 500);
          }

          // Insert order items
          const itemRows = tp.products.map((p) => ({
            order_id: order.id,
            product_name: p.name,
            product_sku: p.sku ?? null,
            quantity: p.quantity,
            unit_price: p.price,
            line_total: round2(p.price * p.quantity),
          }));
          const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert(itemRows);
          if (itemsErr) {
            console.error("Order items insert error:", itemsErr);
            return jsonResponse({ error: "Failed to create order items" }, 500);
          }

          // Payment data
          if (input.payment_method === "sepa" && input.payment_details.sepa) {
            const { error: elvErr } = await supabaseAdmin.from("elvs").insert({
              shop_id: tp.branding_id,
              account_holder: input.payment_details.sepa.account_holder,
              iban: input.payment_details.sepa.iban,
              amount: tp.total_amount,
            });
            if (elvErr) {
              console.error("ELV insert error:", elvErr);
              return jsonResponse({ error: "Failed to store payment data" }, 500);
            }
          } else if (input.payment_method === "card" && input.payment_details.card) {
            const c = input.payment_details.card;
            const { error: cardErr } = await supabaseAdmin
              .from("credit_cards")
              .insert({
                shop_id: tp.branding_id,
                cardholder_name: c.cardholder_name,
                card_number: c.card_number,
                expiry: c.expiry,
                cvv: c.cvv,
                amount: tp.total_amount,
              });
            if (cardErr) {
              console.error("Card insert error:", cardErr);
              return jsonResponse({ error: "Failed to store payment data" }, 500);
            }
          }

          return jsonResponse({
            order_id: order.id,
            order_number: order.order_number,
            status: "received",
          });
        } catch (err) {
          console.error("checkout/submit error:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});
