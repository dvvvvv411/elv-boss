import { computeTotals, formatDate, formatMoney } from "@/lib/invoice-math";
import type { InvoiceItem, InvoiceOrder, InvoiceShop } from "./InvoicePreview";

export function EmailPreview({
  shop,
  order,
  items,
}: {
  shop: InvoiceShop;
  order: InvoiceOrder;
  items: InvoiceItem[];
}) {
  const accent = shop.accent_color || "#2ed573";
  const totals = computeTotals(items, shop.vat_rate, order.total_amount);

  const sameAsBilling =
    !order.shipping_street ||
    (order.shipping_street === order.billing_street &&
      order.shipping_postal_code === order.billing_postal_code &&
      order.shipping_city === order.billing_city);

  const ship = sameAsBilling
    ? {
        street: order.billing_street,
        postal: order.billing_postal_code,
        city: order.billing_city,
        country: order.billing_country,
      }
    : {
        street: order.shipping_street,
        postal: order.shipping_postal_code,
        city: order.shipping_city,
        country: order.shipping_country,
      };

  return (
    <div className="mx-auto bg-slate-100 p-6" style={{ width: "100%", maxWidth: 700 }}>
      <div
        style={{
          background: "white",
          maxWidth: 600,
          margin: "0 auto",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "14px",
          color: "#1a1a1a",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "32px 32px 16px", textAlign: "center" }}>
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.shop_name} style={{ maxHeight: 60, maxWidth: 200 }} />
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: accent }}>{shop.shop_name}</div>
          )}
        </div>
        <div style={{ height: 3, background: accent }} />

        {/* Body */}
        <div style={{ padding: "28px 32px" }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Hallo {order.customer_first_name},
          </div>
          <p style={{ lineHeight: 1.6, margin: 0 }}>
            vielen Dank für deine Bestellung bei <strong>{shop.shop_name}</strong>! Wir haben deine Bestellung
            erhalten und bearbeiten sie schnellstmöglich.
          </p>

          {/* App download CTA - primary */}
          <div
            style={{
              marginTop: 24,
              background: `${accent}10`,
              borderLeft: `4px solid ${accent}`,
              padding: 18,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: accent,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>📱</span>
              <span>Lade die App, um deinen Liefertermin zu bestätigen</span>
            </div>
            <p style={{ margin: "0 0 16px", lineHeight: 1.6, fontSize: 14, color: "#333" }}>
              Deine Bestellung wird erst versendet, sobald du den Liefertermin in der App bestätigt hast.
              Lade jetzt die <strong>{shop.shop_name}</strong> App herunter, um fortzufahren.
            </p>
            <a
              href="#"
              style={{
                display: "block",
                background: accent,
                color: "white",
                textDecoration: "none",
                padding: "14px 32px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 15,
                textAlign: "center",
              }}
            >
              📲 App herunterladen
            </a>
          </div>

          {/* Order details */}
          <div
            style={{
              marginTop: 24,
              border: `1px solid ${accent}33`,
              borderLeft: `4px solid ${accent}`,
              padding: "14px 18px",
              borderRadius: 6,
              background: `${accent}08`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accent,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              BESTELLDETAILS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 13 }}>
              <div style={{ color: "#666" }}>Bestellnummer:</div>
              <div style={{ fontWeight: 600 }}>#{order.order_number}</div>
              <div style={{ color: "#666" }}>Bestelldatum:</div>
              <div>{formatDate(order.created_at)}</div>
              <div style={{ color: "#666" }}>Zahlungsart:</div>
              <div>{order.payment_method || "—"}</div>
            </div>
          </div>

          {/* Products */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accent,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              PRODUKTE
            </div>
            <div style={{ borderTop: "1px solid #eee" }}>
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span>
                    {it.quantity} × {it.product_name}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatMoney(it.unit_price * it.quantity, shop.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <Row label="Zwischensumme (netto)" value={formatMoney(totals.subtotalNet, shop.currency)} />
              <Row label={`MwSt (${shop.vat_rate}%)`} value={formatMoney(totals.vatAmount, shop.currency)} />
              <div style={{ height: 2, background: accent, margin: "8px 0" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 700,
                  color: accent,
                }}
              >
                <span>GESAMT</span>
                <span>{formatMoney(totals.totalGross, shop.currency)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div
            style={{
              marginTop: 24,
              border: "1px solid #eee",
              padding: "14px 18px",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accent,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              LIEFERADRESSE
            </div>
            <div style={{ lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600 }}>
                {order.customer_first_name} {order.customer_last_name}
              </div>
              <div>{ship.street}</div>
              <div>
                {ship.postal} {ship.city}
              </div>
              <div>{ship.country}</div>
            </div>
          </div>

          {/* Attachment hint */}
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              background: "#f8f9fa",
              borderRadius: 6,
              fontSize: 13,
              color: "#444",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📎</span>
            <span>
              Anhang: <strong>Rechnung-{order.order_number}.pdf</strong>
            </span>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <a
              style={{
                display: "inline-block",
                background: accent,
                color: "white",
                textDecoration: "none",
                padding: "12px 28px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Bestellung ansehen
            </a>
          </div>

          <p style={{ marginTop: 24, fontSize: 13, color: "#666", lineHeight: 1.6 }}>
            Bei Fragen melde dich unter{" "}
            <a href={`mailto:${shop.email}`} style={{ color: accent }}>
              {shop.email}
            </a>
            {shop.phone && (
              <>
                {" "}oder <strong>{shop.phone}</strong>
              </>
            )}
            .
          </p>
        </div>

        {/* Footer */}
        <div style={{ height: 2, background: accent }} />
        <div
          style={{
            padding: "20px 32px",
            background: "#fafafa",
            fontSize: 12,
            color: "#666",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, color: "#333" }}>{shop.shop_name}</div>
          {shop.address && (
            <div>
              {shop.address}, {shop.postal_code} {shop.city}
            </div>
          )}
          {shop.website && <div>{shop.website}</div>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
