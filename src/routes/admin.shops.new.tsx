import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { ShopForm, emptyShop, type ShopFormValues } from "@/components/admin/ShopForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/shops/new")({
  head: () => ({
    meta: [{ title: "Shop hinzufügen – ELV BOSS Admin" }],
  }),
  component: NewShopPage,
});

function NewShopPage() {
  const navigate = useNavigate();

  const handleSubmit = async (values: ShopFormValues) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Nicht eingeloggt");
      return;
    }

    const { data, error } = await supabase
      .from("shops")
      .insert({ ...values, owner_id: user.id })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Shop erstellt");
    if (data?.id) {
      try {
        await navigator.clipboard.writeText(data.id);
        toast.success("Shop-ID in Zwischenablage kopiert");
      } catch {
        // ignore
      }
    }
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
            <h1 className="text-2xl font-bold text-slate-900">Shop hinzufügen</h1>
            <p className="text-sm text-slate-500 mt-1">
              Lege einen neuen Shop mit allen Stammdaten an.
            </p>
          </div>
        </div>

        <ShopForm
          initialValues={emptyShop}
          submitLabel="Shop erstellen"
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: "/admin/shops" })}
        />
      </div>
    </AdminShell>
  );
}
