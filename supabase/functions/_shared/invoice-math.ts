// Deno-Port of src/lib/invoice-math.ts

export interface ItemBrutto {
  quantity: number;
  unit_price: number;
}

export interface InvoiceTotals {
  subtotalNet: number;
  vatAmount: number;
  totalGross: number;
  vatRate: number;
}

export function formatMoney(n: number, currency = "EUR", locale = "de-DE"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
}

export function formatDate(iso: string | Date, locale = "de-DE"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function netUnit(unitGross: number, vatRate: number): number {
  return unitGross / (1 + vatRate / 100);
}

export function computeTotals(
  items: ItemBrutto[],
  vatRate: number,
  totalGrossOverride?: number
): InvoiceTotals {
  const factor = 1 + vatRate / 100;
  let subtotalNet = 0;
  let totalGross = 0;
  for (const it of items) {
    const lineGross = it.unit_price * it.quantity;
    totalGross += lineGross;
    subtotalNet += (it.unit_price / factor) * it.quantity;
  }
  if (typeof totalGrossOverride === "number" && totalGrossOverride > 0) {
    totalGross = totalGrossOverride;
  }
  const vatAmount = totalGross - subtotalNet;
  return { subtotalNet, vatAmount, totalGross, vatRate };
}

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  if (clean.length < 8) return iban;
  const first = clean.slice(0, 4);
  const last = clean.slice(-4);
  const middle = "•".repeat(Math.max(0, clean.length - 8));
  return `${first} ${middle.replace(/(.{4})/g, "$1 ").trim()} ${last}`;
}

export function maskCard(num: string): string {
  const clean = num.replace(/\s+/g, "");
  if (clean.length < 4) return num;
  const last = clean.slice(-4);
  return `•••• •••• •••• ${last}`;
}

// Convert "#rrggbb" to {r,g,b}
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return {
    r: isNaN(r) ? 46 : r,
    g: isNaN(g) ? 213 : g,
    b: isNaN(b) ? 115 : b,
  };
}

// Normalize a website to a bare domain
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .replace(/\/+$/, "");
}
