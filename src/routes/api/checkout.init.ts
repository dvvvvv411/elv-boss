import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, preflight } from "@/lib/cors";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { InitSchema } from "@/lib/checkout-validation";
import { signToken } from "@/lib/checkout-token";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const Route = createFileRoute("/api/checkout/init")({
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

          const parsed = InitSchema.safeParse(body);
          if (!parsed.success) {
            return jsonResponse(
              { error: "Validation failed", issues: parsed.error.flatten() },
              400,
            );
          }
          const { branding_id, products, shipping_cost } = parsed.data;

          const { data: shop, error } = await supabaseAdmin
            .from("shops")
            .select("id")
            .eq("id", branding_id)
            .maybeSingle();
          if (error) return jsonResponse({ error: "Database error" }, 500);
          if (!shop) return jsonResponse({ error: "Shop not found" }, 404);

          const itemsTotal = products.reduce(
            (sum, p) => sum + p.price * p.quantity,
            0,
          );
          const total_amount = round2(itemsTotal + shipping_cost);

          const exp = Date.now() + TOKEN_TTL_MS;
          const token = await signToken({
            branding_id,
            products: products.map((p) => ({
              name: p.name,
              price: round2(p.price),
              quantity: p.quantity,
              sku: p.sku ?? null,
            })),
            shipping_cost: round2(shipping_cost),
            total_amount,
            exp,
          });

          return jsonResponse({
            checkout_token: token,
            expires_at: new Date(exp).toISOString(),
          });
        } catch (err) {
          console.error("checkout/init error:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});
