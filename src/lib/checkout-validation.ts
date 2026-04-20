import { z } from "zod";

const UUID = z.string().uuid();

export const InitSchema = z.object({
  branding_id: UUID,
  products: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        price: z.number().min(0).max(1_000_000),
        quantity: z.number().int().min(1).max(10_000),
        sku: z.string().trim().max(100).optional().nullable(),
      }),
    )
    .min(1)
    .max(100),
  shipping_cost: z.number().min(0).max(1_000_000),
});
export type InitInput = z.infer<typeof InitSchema>;

const AddressBase = {
  company_name: z.string().trim().max(255).optional().nullable(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  street: z.string().trim().min(1).max(255),
  postal_code: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().length(2).toUpperCase(),
};

const CustomerSchema = z.object({
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().nullable(),
  ...AddressBase,
});

const BillingAddressSchema = z.object(AddressBase);

// IBAN: 2 letters + 2 digits + up to 30 alphanumerics
const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
const EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = num.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const SepaSchema = z.object({
  account_holder: z.string().trim().min(1).max(255),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(IBAN_REGEX, "Ungültige IBAN")),
});

const CardSchema = z.object({
  cardholder_name: z.string().trim().min(1).max(255),
  card_number: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\d{13,19}$/, "Ungültige Kartennummer")
        .refine(luhn, "Ungültige Kartennummer"),
    ),
  expiry: z.string().trim().regex(EXPIRY_REGEX, "Ungültiges Ablaufdatum (MM/YY)"),
  cvv: z.string().trim().regex(/^\d{3,4}$/, "Ungültiger CVV"),
});

export const SubmitSchema = z
  .object({
    checkout_token: z.string().min(10).max(8000),
    customer: CustomerSchema,
    use_different_billing: z.boolean().optional().default(false),
    billing_address: BillingAddressSchema.optional().nullable(),
    payment_method: z.enum(["sepa", "card"]),
    payment_details: z.object({
      sepa: SepaSchema.optional(),
      card: CardSchema.optional(),
    }),
  })
  .superRefine((val, ctx) => {
    if (val.use_different_billing && !val.billing_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["billing_address"],
        message: "billing_address required when use_different_billing is true",
      });
    }
    if (val.payment_method === "sepa" && !val.payment_details.sepa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payment_details", "sepa"],
        message: "SEPA-Daten fehlen",
      });
    }
    if (val.payment_method === "card" && !val.payment_details.card) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payment_details", "card"],
        message: "Kartendaten fehlen",
      });
    }
  });

export type SubmitInput = z.infer<typeof SubmitSchema>;
