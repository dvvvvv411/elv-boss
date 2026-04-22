// PDF generation for order invoices using jsPDF.
// Renders content analogous to InvoicePreview.tsx — programmatically, not pixel-perfect.
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import {
  computeTotals,
  formatDate,
  formatMoney,
  hexToRgb,
  maskCard,
  maskIban,
  netUnit,
} from "./invoice-math.ts";

export interface PdfShop {
  shop_name: string;
  company_name: string;
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

export interface PdfOrder {
  order_number: string;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_company: string | null;
  billing_street: string;
  billing_postal_code: string;
  billing_city: string;
  billing_country: string;
  shipping_street: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  shipping_first_name: string | null;
  shipping_last_name: string | null;
  shipping_company: string | null;
  total_amount: number;
  payment_method: string | null;
}

export interface PdfItem {
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
}

export type PdfPayment =
  | { kind: "elv"; account_holder: string; iban: string; bank_name?: string | null }
  | { kind: "credit_card"; cardholder_name: string; card_number: string; expiry: string }
  | { kind: "none" };

export function renderInvoicePDF(
  shop: PdfShop,
  order: PdfOrder,
  items: PdfItem[],
  payment: PdfPayment
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const accent = hexToRgb(shop.accent_color || "#2ed573");

  const pageW = 210;
  const margin = 15;
  let y = margin;

  // ===== HEADER =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text(shop.shop_name, margin, y + 6);

  // Company block (right)
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  const rightX = pageW - margin;
  let ry = y;
  doc.text(shop.company_name, rightX, ry, { align: "right" });
  doc.setFont("helvetica", "normal");
  if (shop.address) {
    ry += 4;
    doc.text(shop.address, rightX, ry, { align: "right" });
  }
  ry += 4;
  doc.text(`${shop.postal_code ?? ""} ${shop.city ?? ""}`.trim(), rightX, ry, { align: "right" });
  ry += 4;
  doc.text(shop.country, rightX, ry, { align: "right" });
  if (shop.phone) {
    ry += 4;
    doc.text(shop.phone, rightX, ry, { align: "right" });
  }
  ry += 4;
  doc.text(shop.email, rightX, ry, { align: "right" });

  y = Math.max(y + 12, ry + 4);

  // Accent bar
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(margin, y, pageW - 2 * margin, 1, "F");
  y += 8;

  // ===== ADDRESSES + INVOICE BOX =====
  const colW = (pageW - 2 * margin - 8) / 3;
  const addrTop = y;

  const writeAddrCol = (xStart: number, label: string, lines: string[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(label, xStart, addrTop);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    let ay = addrTop + 5;
    for (const line of lines) {
      doc.text(line, xStart, ay);
      ay += 4.5;
    }
    return ay;
  };

  const billingLines = [
    [order.customer_company, [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join("\n"),
  ]
    .join("\n")
    .split("\n")
    .filter(Boolean);
  billingLines.push(order.billing_street);
  billingLines.push(`${order.billing_postal_code} ${order.billing_city}`);
  billingLines.push(order.billing_country);

  const sameAsBilling =
    !order.shipping_street ||
    (order.shipping_street === order.billing_street &&
      order.shipping_postal_code === order.billing_postal_code &&
      order.shipping_city === order.billing_city);

  let shippingLines: string[];
  if (sameAsBilling) {
    shippingLines = ["identisch mit Rechnungsadresse"];
  } else {
    const recvName = [
      order.shipping_first_name ?? order.customer_first_name,
      order.shipping_last_name ?? order.customer_last_name,
    ]
      .filter(Boolean)
      .join(" ");
    shippingLines = [];
    if (order.shipping_company) shippingLines.push(order.shipping_company);
    shippingLines.push(recvName);
    shippingLines.push(order.shipping_street!);
    shippingLines.push(`${order.shipping_postal_code ?? ""} ${order.shipping_city ?? ""}`.trim());
    shippingLines.push(order.shipping_country ?? order.billing_country);
  }

  const yA = writeAddrCol(margin, "RECHNUNGSADRESSE", billingLines);
  const yB = writeAddrCol(margin + colW + 4, "LIEFERADRESSE", shippingLines);

  // Invoice box (3rd col)
  const boxX = margin + 2 * (colW + 4);
  const boxY = addrTop - 3;
  const boxW = colW;
  const boxH = 36;
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxW, boxH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text("RECHNUNG", boxX + 3, boxY + 6);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Rechnungs-Nr.:", boxX + 3, boxY + 12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(order.order_number, boxX + 28, boxY + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Rechnungsdatum:", boxX + 3, boxY + 17);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDate(new Date()), boxX + 28, boxY + 17);

  doc.setTextColor(100, 100, 100);
  doc.text("Bestellnummer:", boxX + 3, boxY + 22);
  doc.setTextColor(20, 20, 20);
  doc.text(order.order_number, boxX + 28, boxY + 22);

  doc.setTextColor(100, 100, 100);
  doc.text("Bestelldatum:", boxX + 3, boxY + 27);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDate(order.created_at), boxX + 28, boxY + 27);

  y = Math.max(yA, yB, boxY + boxH) + 6;

  // ===== ITEMS TABLE =====
  const tableX = margin;
  const tableW = pageW - 2 * margin;
  const cols = {
    pos: { x: tableX + 1, w: 8, align: "left" as const },
    desc: { x: tableX + 10, w: 70, align: "left" as const },
    sku: { x: tableX + 82, w: 22, align: "left" as const },
    qty: { x: tableX + 110, w: 12, align: "right" as const },
    vat: { x: tableX + 130, w: 14, align: "right" as const },
    unit: { x: tableX + 158, w: 22, align: "right" as const },
    line: { x: tableX + tableW - 1, w: 25, align: "right" as const },
  };

  // Header
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(tableX, y, tableW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const hy = y + 4.8;
  doc.text("Pos", cols.pos.x, hy);
  doc.text("Beschreibung", cols.desc.x, hy);
  doc.text("SKU", cols.sku.x, hy);
  doc.text("Menge", cols.qty.x, hy, { align: "right" });
  doc.text("MwSt", cols.vat.x, hy, { align: "right" });
  doc.text("Einzel netto", cols.unit.x, hy, { align: "right" });
  doc.text("Summe brutto", cols.line.x, hy, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(8);

  items.forEach((it, i) => {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    const ry = y + 4.5;
    doc.text(String(i + 1), cols.pos.x, ry);
    const nameLines = doc.splitTextToSize(it.product_name, cols.desc.w);
    doc.text(nameLines, cols.desc.x, ry);
    doc.setTextColor(120, 120, 120);
    doc.text(it.product_sku || "—", cols.sku.x, ry);
    doc.setTextColor(20, 20, 20);
    doc.text(String(it.quantity), cols.qty.x, ry, { align: "right" });
    doc.text(`${shop.vat_rate}%`, cols.vat.x, ry, { align: "right" });
    doc.text(formatMoney(netUnit(it.unit_price, shop.vat_rate), shop.currency), cols.unit.x, ry, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.text(formatMoney(it.unit_price * it.quantity, shop.currency), cols.line.x, ry, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");

    const rowH = Math.max(6.5, nameLines.length * 4.2 + 2);
    y += rowH;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(tableX, y, tableX + tableW, y);
  });

  y += 4;

  // ===== TOTALS =====
  const totals = computeTotals(items, shop.vat_rate, order.total_amount);
  const totalsX = pageW - margin - 70;
  const totalsW = 70;
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);

  doc.text("Zwischensumme (netto)", totalsX, y + 4);
  doc.text(formatMoney(totals.subtotalNet, shop.currency), totalsX + totalsW, y + 4, { align: "right" });
  y += 5;

  doc.text(`MwSt ${shop.vat_rate}%`, totalsX, y + 4);
  doc.text(formatMoney(totals.vatAmount, shop.currency), totalsX + totalsW, y + 4, { align: "right" });
  y += 6;

  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(totalsX, y, totalsW, 0.7, "F");
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text("GESAMT", totalsX, y + 4);
  doc.text(formatMoney(totals.totalGross, shop.currency), totalsX + totalsW, y + 4, { align: "right" });
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);

  // ===== PAYMENT BOX =====
  if (y > 240) {
    doc.addPage();
    y = margin;
  }
  const payH = 24;
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pageW - 2 * margin, payH);
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(margin, y, 1.5, payH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text("ZAHLUNGSDETAILS", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  let py = y + 10;
  if (payment.kind === "elv") {
    doc.setFont("helvetica", "bold");
    doc.text("Lastschrift (SEPA)", margin + 4, py);
    doc.setFont("helvetica", "normal");
    doc.text("– Der Betrag wird vom folgenden Konto eingezogen.", margin + 38, py);
    py += 4.5;
    doc.text(`Kontoinhaber: ${payment.account_holder}`, margin + 4, py);
    py += 4.5;
    doc.setFont("courier", "normal");
    doc.text(`IBAN: ${maskIban(payment.iban)}`, margin + 4, py);
    doc.setFont("helvetica", "normal");
  } else if (payment.kind === "credit_card") {
    doc.setFont("helvetica", "bold");
    doc.text("Kreditkarte", margin + 4, py);
    doc.setFont("helvetica", "normal");
    doc.text("– Wird bei Lieferung abgebucht.", margin + 24, py);
    py += 4.5;
    doc.text(`Karteninhaber: ${payment.cardholder_name}`, margin + 4, py);
    py += 4.5;
    doc.setFont("courier", "normal");
    doc.text(`Karte: ${maskCard(payment.card_number)}   Gültig: ${payment.expiry}`, margin + 4, py);
    doc.setFont("helvetica", "normal");
  } else {
    doc.setTextColor(120, 120, 120);
    doc.text(`Keine Zahlungsdetails hinterlegt (${order.payment_method ?? "unbekannt"}).`, margin + 4, py);
    doc.setTextColor(20, 20, 20);
  }
  y += payH + 8;

  // Thank-you line
  doc.setFontSize(10);
  doc.text(`Vielen Dank für Ihren Einkauf bei ${shop.shop_name}!`, pageW / 2, y, { align: "center" });
  y += 8;

  // ===== FOOTER =====
  if (y > 260) {
    doc.addPage();
    y = margin;
  }
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(margin, y, pageW - 2 * margin, 0.7, "F");
  y += 4;

  const fcolW = (pageW - 2 * margin) / 4;
  const writeFooterCol = (idx: number, title: string, lines: string[]) => {
    const fx = margin + idx * fcolW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(title, fx, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 70);
    let fy = y + 4;
    for (const line of lines) {
      if (!line) continue;
      doc.text(line, fx, fy);
      fy += 3.5;
    }
  };

  writeFooterCol(0, "Unternehmen", [
    shop.company_name,
    shop.business_owner ?? "",
    shop.address ?? "",
    `${shop.postal_code ?? ""} ${shop.city ?? ""}`.trim(),
  ]);
  writeFooterCol(1, "Kontakt", [shop.phone ?? "", shop.email, shop.website ?? ""]);
  writeFooterCol(
    2,
    "Rechtliches",
    [
      shop.commercial_register_number ? `HRB: ${shop.commercial_register_number}` : "",
      shop.vat_id ? `USt-ID: ${shop.vat_id}` : "",
      shop.court ?? "",
    ]
  );
  writeFooterCol(3, "Hinweise", [`Beträge in ${shop.currency}`, `inkl. ${shop.vat_rate}% MwSt`]);

  const out = doc.output("arraybuffer");
  return new Uint8Array(out);
}
