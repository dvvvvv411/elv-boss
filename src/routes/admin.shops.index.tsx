import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Copy, Pencil, Trash2, Store, Mail, Phone, Globe, MapPin } from "lucide-react";
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
  phone: string | null;
  website: string | null;
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
      .select("id, shop_name, company_name, email, phone, website, city, logo_url, accent_color")
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
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
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
        <div className="flex flex-col gap-3">
          {shops.map((shop) => {
            const shortId = `${shop.id.slice(0, 8)}…${shop.id.slice(-4)}`;
            return (
              <Card
                key={shop.id}
                className="relative overflow-hidden p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center gap-5"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: shop.accent_color }}
                />

                {/* Logo / Avatar */}
                {shop.logo_url ? (
                  <img
                    src={shop.logo_url}
                    alt={shop.shop_name}
                    className="h-14 w-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    style={{ boxShadow: `0 0 0 2px ${shop.accent_color}25` }}
                  />
                ) : (
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                    style={{
                      background: shop.accent_color,
                      boxShadow: `0 0 0 2px ${shop.accent_color}25`,
                    }}
                  >
                    {shop.shop_name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base text-slate-900 truncate">
                      {shop.shop_name}
                    </h3>
                    {shop.city && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5">
                        <MapPin className="h-3 w-3" />
                        {shop.city}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{shop.company_name}</p>

                  <div className="mt-2 flex items-center gap-4 flex-wrap text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{shop.email}</span>
                    </span>
                    {shop.phone && (
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{shop.phone}</span>
                      </span>
                    )}
                    {shop.website && (
                      <span className="inline-flex items-center gap-1.5 truncate max-w-[18rem]">
                        <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{shop.website}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ID pill */}
                <div className="flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-1 shrink-0">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                    ID
                  </span>
                  <code className="text-[11px] text-slate-700 font-mono">{shortId}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyId(shop.id)}
                    title="ID kopieren"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
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
                    variant="ghost"
                    size="icon"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => setDeleteId(shop.id)}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
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
