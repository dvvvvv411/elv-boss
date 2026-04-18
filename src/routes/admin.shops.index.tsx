import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Copy, Pencil, Trash2, Store } from "lucide-react";
import { toast, Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BRAND = "#2ed573";

type Shop = {
  id: string;
  shop_name: string;
  company_name: string;
  email: string;
  city: string | null;
  logo_url: string | null;
  accent_color: string;
};

export const Route = createFileRoute("/admin/shops/")({
  head: () => ({
    meta: [{ title: "Shops – ELV BOSS Admin" }],
  }),
  component: ShopsPage,
});

function ShopsPage() {
  return (
    <AdminShell>
      <Toaster richColors position="top-center" />
      <ShopsContent />
    </AdminShell>
  );
}

function ShopsContent() {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    const { data, error } = await supabase
      .from("shops")
      .select("id, shop_name, company_name, email, city, logo_url, accent_color")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setShops([]);
      return;
    }
    setShops(data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("shops").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Shop gelöscht");
      setShops((prev) => (prev ? prev.filter((s) => s.id !== deleteId) : prev));
    }
    setDeleteId(null);
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Shop-ID kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shops</h1>
          <p className="text-sm text-slate-500 mt-1">Verwalte alle deine Shops.</p>
        </div>
        <Button asChild className="text-white" style={{ background: BRAND }}>
          <Link to="/admin/shops/new">
            <Plus className="h-4 w-4" />
            Shop hinzufügen
          </Link>
        </Button>
      </div>

      {shops === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <Card className="p-12 border-dashed border-slate-300 shadow-none flex flex-col items-center justify-center text-center">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: `${BRAND}20`, color: BRAND }}
          >
            <Store className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-slate-900">Noch keine Shops</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Lege deinen ersten Shop an, um loszulegen.
          </p>
          <Button asChild className="text-white" style={{ background: BRAND }}>
            <Link to="/admin/shops/new">
              <Plus className="h-4 w-4" />
              Shop hinzufügen
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card key={shop.id} className="p-5 border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-start gap-3">
                {shop.logo_url ? (
                  <img
                    src={shop.logo_url}
                    alt={shop.shop_name}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: shop.accent_color }}
                  >
                    {shop.shop_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{shop.shop_name}</h3>
                  <p className="text-xs text-slate-500 truncate">{shop.company_name}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1 text-xs text-slate-600">
                <div className="truncate">{shop.email}</div>
                {shop.city && <div className="text-slate-500">{shop.city}</div>}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                <code className="text-[10px] text-slate-600 truncate flex-1 font-mono">
                  {shop.id}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => copyId(shop.id)}
                  title="ID kopieren"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    navigate({
                      to: "/admin/shops/$id/edit",
                      params: { id: shop.id },
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => setDeleteId(shop.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shop wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
