// HTML email template for order confirmation (analog EmailPreview.tsx).
// Logo is rendered as text in shop.accent_color — no <img>.
import { computeTotals, formatMoney } from "./invoice-math.ts";

export interface EmailShop {
  shop_name: string;
  company_name: string;
  accent_color: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  email: string;
  phone: string | null;
  website: string | null;
  vat_rate: number;
  currency: string;
}

export interface EmailOrder {
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  total_amount: number;
}

export interface EmailItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface EmailLinks {
  appDownloadUrl: string | null;
  orderViewUrl: string | null;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

export function renderConfirmationEmailHTML(
  shop: EmailShop,
  order: EmailOrder,
  items: EmailItem[],
  links: EmailLinks
): string {
  const accent = shop.accent_color || "#2ed573";
  const totals = computeTotals(items, shop.vat_rate, order.total_amount);

  const itemsRows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:14px;color:#1a1a1a;">
          ${escapeHtml(it.product_name)}
          <div style="font-size:12px;color:#777;">Menge: ${it.quantity}</div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-size:14px;color:#1a1a1a;font-weight:600;white-space:nowrap;">
          ${escapeHtml(formatMoney(it.unit_price * it.quantity, shop.currency))}
        </td>
      </tr>`
    )
    .join("");

  const appBtn = links.appDownloadUrl
    ? `<a href="${escapeHtml(links.appDownloadUrl)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px;margin:6px 4px;">App herunterladen</a>`
    : "";
  const orderBtn = links.orderViewUrl
    ? `<a href="${escapeHtml(links.orderViewUrl)}" style="display:inline-block;background:#fff;color:${accent};text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:600;font-size:14px;border:2px solid ${accent};margin:6px 4px;">Bestellung ansehen</a>`
    : "";

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bestellbestätigung</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:28px 32px 16px 32px;text-align:center;border-bottom:3px solid ${accent};">
              <div style="font-size:28px;font-weight:800;color:${accent};letter-spacing:-0.02em;">
                ${escapeHtml(shop.shop_name)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;color:#1a1a1a;">Vielen Dank für Ihre Bestellung!</h1>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.55;color:#444;">
                Hallo ${escapeHtml(order.customer_first_name)} ${escapeHtml(order.customer_last_name)},
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#444;">
                wir haben Ihre Bestellung erhalten und bearbeiten sie schnellstmöglich.
                Ihre Rechnung finden Sie als PDF im Anhang dieser E-Mail.
              </p>

              <div style="background:#f8f9fb;border:1px solid #ececf1;border-radius:6px;padding:16px;margin:20px 0;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#888;font-weight:700;">Bestellnummer</div>
                <div style="font-size:18px;font-weight:700;color:${accent};margin-top:4px;">#${escapeHtml(order.order_number)}</div>
              </div>

              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#888;font-weight:700;margin:24px 0 8px 0;">Bestelldetails</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${itemsRows}
                <tr>
                  <td style="padding:14px 8px 4px 8px;text-align:right;font-size:14px;color:#1a1a1a;font-weight:700;">Gesamt</td>
                  <td style="padding:14px 8px 4px 8px;text-align:right;font-size:18px;font-weight:800;color:${accent};white-space:nowrap;">
                    ${escapeHtml(formatMoney(totals.totalGross, shop.currency))}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:0 8px 8px 8px;text-align:right;font-size:11px;color:#888;">
                    inkl. ${shop.vat_rate}% MwSt (${escapeHtml(formatMoney(totals.vatAmount, shop.currency))})
                  </td>
                </tr>
              </table>

              ${
                appBtn || orderBtn
                  ? `<div style="text-align:center;margin:28px 0 8px 0;">${appBtn}${orderBtn}</div>`
                  : ""
              }
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #ececf1;font-size:12px;color:#888;line-height:1.6;text-align:center;">
              <div style="font-weight:700;color:#555;">${escapeHtml(shop.company_name)}</div>
              ${shop.address ? `<div>${escapeHtml(shop.address)}</div>` : ""}
              <div>${escapeHtml(`${shop.postal_code ?? ""} ${shop.city ?? ""}`.trim())} · ${escapeHtml(shop.country)}</div>
              <div style="margin-top:6px;">
                ${shop.phone ? `${escapeHtml(shop.phone)} · ` : ""}<a href="mailto:${escapeHtml(shop.email)}" style="color:${accent};text-decoration:none;">${escapeHtml(shop.email)}</a>
              </div>
              ${shop.website ? `<div><a href="${escapeHtml(/^https?:\/\//i.test(shop.website) ? shop.website : `https://${shop.website}`)}" style="color:${accent};text-decoration:none;">${escapeHtml(shop.website)}</a></div>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
