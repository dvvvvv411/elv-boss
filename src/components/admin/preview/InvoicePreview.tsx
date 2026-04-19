import { computeTotals, formatDate, formatMoney, maskCard, maskIban, netUnit } from "@/lib/invoice-math";

export interface InvoiceShop {
  shop_name: string;
  company_name: string;
  logo_url: string | null;
  accent_color: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string;
  website: string | null;
  business_owner: string | null;
  commercial_register_number: string | null;
  vat_id: string | null;
  court: string | null;
  vat_rate: number;
  currency: string;
}

export interface InvoiceOrder {
  order_number: string;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
  billing_street: string;
  billing_postal_code: string;
  billing_city: string;
  billing_country: string;
  shipping_street: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  total_amount: number;
  currency: string;
  payment_method: string | null;
}

export interface InvoiceItem {
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
}

export interface InvoicePayment {
  kind: "elv" | "credit_card" | "none";
  // elv
  iban?: string;
  account_holder?: string;
  bank_name?: string | null;
  // cc
  card_number?: string;
  cardholder_name?: string;
  expiry?: string;
}

export function InvoicePreview({
  shop,
  order,
  items,
  payment,
  zoom = 1,
}: {
  shop: InvoiceShop;
  order: InvoiceOrder;
  items: InvoiceItem[];
  payment: InvoicePayment;
  zoom?: number;
}) {
  const totals = computeTotals(items, shop.vat_rate, order.total_amount);
  const accent = shop.accent_color || "#2ed573";

  const sameAsBilling =
    !order.shipping_street ||
    (order.shipping_street === order.billing_street &&
      order.shipping_postal_code === order.billing_postal_code &&
      order.shipping_city === order.billing_city);

  return (
    <div
      className="bg-white shadow-2xl mx-auto origin-top"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "16mm",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#1a1a1a",
        fontSize: "10pt",
        transform: `scale(${zoom})`,
        transformOrigin: "top center",
        ["--brand" as string]: accent,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex-1">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.shop_name} style={{ maxHeight: "60px", maxWidth: "200px" }} />
          ) : (
            <div style={{ fontSize: "20pt", fontWeight: 700, color: accent }}>{shop.shop_name}</div>
          )}
          {shop.logo_url && (
            <div style={{ fontSize: "14pt", fontWeight: 600, marginTop: 8 }}>{shop.shop_name}</div>
          )}
          {shop.website && <div style={{ color: "#666", marginTop: 2 }}>{shop.website}</div>}
        </div>
        <div className="text-right" style={{ fontSize: "9pt", lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{shop.company_name}</div>
          {shop.address && <div>{shop.address}</div>}
          <div>
            {shop.postal_code} {shop.city}
          </div>
          <div>{shop.country}</div>
          {shop.phone && <div>{shop.phone}</div>}
          <div>{shop.email}</div>
        </div>
      </div>

      <div style={{ height: 3, background: accent, marginTop: 12, marginBottom: 20 }} />

      {/* Addresses + Invoice Box */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div style={{ fontSize: "8pt", fontWeight: 700, color: accent, letterSpacing: "0.05em" }}>
            RECHNUNGSADRESSE
          </div>
          <div style={{ marginTop: 6, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600 }}>
              {order.customer_first_name} {order.customer_last_name}
            </div>
            <div>{order.billing_street}</div>
            <div>
              {order.billing_postal_code} {order.billing_city}
            </div>
            <div>{order.billing_country}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "8pt", fontWeight: 700, color: accent, letterSpacing: "0.05em" }}>
            LIEFERADRESSE
          </div>
          <div style={{ marginTop: 6, lineHeight: 1.5 }}>
            {sameAsBilling ? (
              <div style={{ color: "#666", fontStyle: "italic" }}>identisch mit Rechnungsadresse</div>
            ) : (
              <>
                <div style={{ fontWeight: 600 }}>
                  {order.customer_first_name} {order.customer_last_name}
                </div>
                <div>{order.shipping_street}</div>
                <div>
                  {order.shipping_postal_code} {order.shipping_city}
                </div>
                <div>{order.shipping_country}</div>
              </>
            )}
          </div>
        </div>
        <div style={{ border: `1.5px solid ${accent}`, padding: "12px", borderRadius: 4 }}>
          <div style={{ fontSize: "12pt", fontWeight: 700, color: accent, marginBottom: 8 }}>RECHNUNG</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", fontSize: "9pt" }}>
            <div style={{ color: "#666" }}>Rechnungs-Nr.:</div>
            <div style={{ fontWeight: 600 }}>{order.order_number}</div>
            <div style={{ color: "#666" }}>Rechnungsdatum:</div>
            <div>{formatDate(new Date())}</div>
            <div style={{ color: "#666" }}>Bestellnummer:</div>
            <div>{order.order_number}</div>
            <div style={{ color: "#666" }}>Bestelldatum:</div>
            <div>{formatDate(order.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24, fontSize: "9pt" }}>
        <thead>
          <tr style={{ background: accent, color: "white" }}>
            <th style={{ padding: "8px", textAlign: "left", width: "30px" }}>Pos</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Beschreibung</th>
            <th style={{ padding: "8px", textAlign: "left", width: "80px" }}>SKU</th>
            <th style={{ padding: "8px", textAlign: "right", width: "50px" }}>Menge</th>
            <th style={{ padding: "8px", textAlign: "right", width: "60px" }}>MwSt</th>
            <th style={{ padding: "8px", textAlign: "right", width: "80px" }}>Einzel netto</th>
            <th style={{ padding: "8px", textAlign: "right", width: "90px" }}>Summe brutto</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px" }}>{i + 1}</td>
              <td style={{ padding: "8px" }}>{it.product_name}</td>
              <td style={{ padding: "8px", color: "#666" }}>{it.product_sku || "—"}</td>
              <td style={{ padding: "8px", textAlign: "right" }}>{it.quantity}</td>
              <td style={{ padding: "8px", textAlign: "right" }}>{shop.vat_rate}%</td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                {formatMoney(netUnit(it.unit_price, shop.vat_rate), shop.currency)}
              </td>
              <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>
                {formatMoney(it.unit_price * it.quantity, shop.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <div style={{ width: "260px", fontSize: "10pt" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>Zwischensumme (netto)</span>
            <span>{formatMoney(totals.subtotalNet, shop.currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>MwSt {shop.vat_rate}%</span>
            <span>{formatMoney(totals.vatAmount, shop.currency)}</span>
          </div>
          <div style={{ height: 2, background: accent, margin: "6px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontSize: "12pt",
              fontWeight: 700,
              color: accent,
            }}
          >
            <span>GESAMT</span>
            <span>{formatMoney(totals.totalGross, shop.currency)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div
        style={{
          marginTop: 24,
          border: `1px solid ${accent}`,
          borderLeft: `4px solid ${accent}`,
          padding: "12px 16px",
          borderRadius: 4,
        }}
      >
        <div style={{ fontSize: "9pt", fontWeight: 700, color: accent, letterSpacing: "0.05em", marginBottom: 6 }}>
          ZAHLUNGSDETAILS
        </div>
        {payment.kind === "elv" && (
          <div style={{ fontSize: "9pt", lineHeight: 1.6 }}>
            <div>
              <strong>Lastschrift (SEPA)</strong> – Der Betrag wird von folgendem Konto eingezogen:
            </div>
            <div>Kontoinhaber: {payment.account_holder}</div>
            <div style={{ fontFamily: "monospace" }}>IBAN: {maskIban(payment.iban || "")}</div>
            {payment.bank_name && <div>Bank: {payment.bank_name}</div>}
          </div>
        )}
        {payment.kind === "credit_card" && (
          <div style={{ fontSize: "9pt", lineHeight: 1.6 }}>
            <div>
              <strong>Kreditkarte</strong> – Wird bei Lieferung abgebucht.
            </div>
            <div>Karteninhaber: {payment.cardholder_name}</div>
            <div style={{ fontFamily: "monospace" }}>Karte: {maskCard(payment.card_number || "")}</div>
            {payment.expiry && <div>Gültig bis: {payment.expiry}</div>}
          </div>
        )}
        {payment.kind === "none" && (
          <div style={{ fontSize: "9pt", color: "#666" }}>
            Keine Zahlungsdetails hinterlegt ({order.payment_method || "unbekannt"}).
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, textAlign: "center", fontSize: "10pt" }}>
        Vielen Dank für Ihren Einkauf bei <strong>{shop.shop_name}</strong>!
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32 }}>
        <div style={{ height: 2, background: accent, marginBottom: 10 }} />
        <div className="grid grid-cols-4 gap-4" style={{ fontSize: "8pt", color: "#444", lineHeight: 1.5 }}>
          <div>
            <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>Unternehmen</div>
            <div>{shop.company_name}</div>
            {shop.business_owner && <div>{shop.business_owner}</div>}
            {shop.address && <div>{shop.address}</div>}
            <div>
              {shop.postal_code} {shop.city}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>Kontakt</div>
            {shop.phone && <div>{shop.phone}</div>}
            <div>{shop.email}</div>
            {shop.website && <div>{shop.website}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>Rechtliches</div>
            {shop.commercial_register_number && <div>HRB: {shop.commercial_register_number}</div>}
            {shop.vat_id && <div>USt-ID: {shop.vat_id}</div>}
            {shop.court && <div>{shop.court}</div>}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>Hinweise</div>
            <div>Beträge in {shop.currency}</div>
            <div>inkl. {shop.vat_rate}% MwSt</div>
          </div>
        </div>
      </div>
    </div>
  );
}
