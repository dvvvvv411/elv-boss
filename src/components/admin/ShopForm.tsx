import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRAND = "#2ed573";

export type ShopFormValues = {
  shop_name: string;
  company_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  currency: string;
  language: string;
  vat_id: string;
  business_owner: string;
  court: string;
  commercial_register_number: string;
  vat_rate: number;
  resend_api_key: string;
  sender_email: string;
  sender_name: string;
  sms_sender_name: string;
  logo_url: string;
  accent_color: string;
};

export const emptyShop: ShopFormValues = {
  shop_name: "",
  company_name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  postal_code: "",
  country: "DE",
  currency: "EUR",
  language: "de",
  vat_id: "",
  business_owner: "",
  court: "",
  commercial_register_number: "",
  vat_rate: 19,
  resend_api_key: "",
  sender_email: "",
  sender_name: "",
  sms_sender_name: "",
  logo_url: "",
  accent_color: "#2ed573",
};

const schema = z.object({
  shop_name: z.string().trim().min(1, "Shopname ist erforderlich").max(100),
  company_name: z.string().trim().min(1, "Firmenname ist erforderlich").max(150),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  vat_rate: z.number().min(0).max(100),
  sender_email: z
    .string()
    .trim()
    .email("Ungültige Absender-Email")
    .optional()
    .or(z.literal("")),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Ungültige Hex-Farbe"),
});

export function ShopForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues: ShopFormValues;
  submitLabel: string;
  onSubmit: (values: ShopFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ShopFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof ShopFormValues>(key: K, val: ShopFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: val }));

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("shop-logos").upload(path, file, {
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("shop-logos").getPublicUrl(path);
      update("logo_url", data.publicUrl);
      toast.success("Logo hochgeladen");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Validierungsfehler");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Allgemein">
        <Field label="Shopname *">
          <Input value={values.shop_name} onChange={(e) => update("shop_name", e.target.value)} />
        </Field>
        <Field label="Firmenname *">
          <Input
            value={values.company_name}
            onChange={(e) => update("company_name", e.target.value)}
          />
        </Field>
        <Field label="E-Mail *">
          <Input
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Telefon">
          <Input value={values.phone} onChange={(e) => update("phone", e.target.value)} />
        </Field>
        <Field label="Website" className="md:col-span-2">
          <Input
            placeholder="https://..."
            value={values.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Adresse">
        <Field label="Adresse" className="md:col-span-2">
          <Input value={values.address} onChange={(e) => update("address", e.target.value)} />
        </Field>
        <Field label="Stadt">
          <Input value={values.city} onChange={(e) => update("city", e.target.value)} />
        </Field>
        <Field label="Postleitzahl">
          <Input
            value={values.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
          />
        </Field>
        <Field label="Land">
          <Select value={values.country} onValueChange={(v) => update("country", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DE">Deutschland</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Währung">
          <Select value={values.currency} onValueChange={(v) => update("currency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">Euro €</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sprache">
          <Select value={values.language} onValueChange={(v) => update("language", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Rechtliches">
        <Field label="USt-ID">
          <Input value={values.vat_id} onChange={(e) => update("vat_id", e.target.value)} />
        </Field>
        <Field label="Geschäftsinhaber">
          <Input
            value={values.business_owner}
            onChange={(e) => update("business_owner", e.target.value)}
          />
        </Field>
        <Field label="Amtsgericht">
          <Input value={values.court} onChange={(e) => update("court", e.target.value)} />
        </Field>
        <Field label="Handelsregisternummer">
          <Input
            value={values.commercial_register_number}
            onChange={(e) => update("commercial_register_number", e.target.value)}
          />
        </Field>
        <Field label="Mehrwertsteuersatz (%)">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={values.vat_rate}
            onChange={(e) => update("vat_rate", Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="E-Mail Konfiguration">
        <Field label="Resend API Key" className="md:col-span-2">
          <Input
            type="password"
            placeholder="re_..."
            value={values.resend_api_key}
            onChange={(e) => update("resend_api_key", e.target.value)}
          />
        </Field>
        <Field label="Absender E-Mail">
          <Input
            type="email"
            value={values.sender_email}
            onChange={(e) => update("sender_email", e.target.value)}
          />
        </Field>
        <Field label="Absender Name">
          <Input
            value={values.sender_name}
            onChange={(e) => update("sender_name", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="SMS Konfiguration (seven.io)">
        <Field label="SMS Absendername" className="md:col-span-2">
          <Input
            value={values.sms_sender_name}
            onChange={(e) => update("sms_sender_name", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Branding">
        <Field label="Shop Logo" className="md:col-span-2">
          <div className="flex items-center gap-4">
            {values.logo_url ? (
              <img
                src={values.logo_url}
                alt="Logo Vorschau"
                className="h-16 w-16 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Upload className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleLogoUpload(f);
                }}
              />
              {uploading && (
                <p className="text-xs text-slate-500 mt-1">Wird hochgeladen...</p>
              )}
            </div>
          </div>
        </Field>
        <Field label="Akzentfarbe" className="md:col-span-2">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={values.accent_color}
              onChange={(e) => update("accent_color", e.target.value)}
              className="h-10 w-16 rounded border border-slate-200 cursor-pointer"
            />
            <Input
              value={values.accent_color}
              onChange={(e) => update("accent_color", e.target.value)}
              className="max-w-[140px] font-mono"
            />
          </div>
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={submitting || uploading}
          className="text-white"
          style={{ background: BRAND }}
        >
          {submitting ? "Speichert..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 border-slate-200 shadow-sm">
      <h2 className="font-semibold text-slate-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-600 mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
