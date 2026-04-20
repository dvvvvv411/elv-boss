import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, preflight } from "@/lib/cors";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyToken } from "@/lib/checkout-token";

export const Route = createFileRoute("/api/checkout/session/$token")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => {
        try {
          const result = await verifyToken(params.token);
          if (!result.ok) {
            if (result.reason === "expired") {
              return jsonResponse({ error: "Token expired" }, 410);
            }
            return jsonResponse({ error: "Invalid token" }, 401);
          }
          const payload = result.payload;

          const { data: shop, error } = await supabaseAdmin
            .from("shops")
            .select("company_name, logo_url, vat_rate, currency")
            .eq("id", payload.branding_id)
            .maybeSingle();
          if (error) return jsonResponse({ error: "Database error" }, 500);
          if (!shop) return jsonResponse({ error: "Shop not found" }, 404);

          const rawVat = Number(shop.vat_rate ?? 0);
          const vat_rate = rawVat > 1 ? rawVat / 100 : rawVat;

          return jsonResponse({
            branding: {
              company_name: shop.company_name,
              logo_url: shop.logo_url,
              vat_rate,
              currency: shop.currency,
            },
            products: payload.products,
            shipping_cost: payload.shipping_cost,
            total_amount: payload.total_amount,
            expires_at: new Date(payload.exp).toISOString(),
          });
        } catch (err) {
          console.error("checkout/session error:", err);
          return jsonResponse({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});
