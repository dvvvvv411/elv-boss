import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  ShopForm,
  emptyShop,
  type ShopFormValues,
} from "@/components/admin/ShopForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/shops/$id/edit")({
  head: () => ({
    meta: [{ title: "Shop bearbeiten – ELV BOSS Admin" }],
  }),
  component: EditShopPage,
});

function EditShopPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<ShopFormValues | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data) {
        toast.error("Shop nicht gefunden");
        navigate({ to: "/admin/shops" });
        return;
      }
      setValues({
        ...emptyShop,
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, v ?? emptyShop[k as keyof ShopFormValues] ?? ""]),
        ),
        vat_rate: Number(data.vat_rate ?? 19),
      } as ShopFormValues);
    })();
  }, [id, navigate]);

  const handleSubmit = async (vals: ShopFormValues) => {
    const { error } = await supabase.from("shops").update(vals).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Shop aktualisiert");
    navigate({ to: "/admin/shops" });
  };

  return (
    <AdminShell>
      <Toaster richColors position="top-center" />
      <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-4xl w-full">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/admin/shops">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shop bearbeiten</h1>
            <p className="text-sm text-slate-500 mt-1">Stammdaten aktualisieren.</p>
          </div>
        </div>

        {!values ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <ShopForm
            shopId={id}
            initialValues={values}
            submitLabel="Änderungen speichern"
            onSubmit={handleSubmit}
            onCancel={() => navigate({ to: "/admin/shops" })}
          />
        )}
      </div>
    </AdminShell>
  );
}
