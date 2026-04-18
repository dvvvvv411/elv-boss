import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/elvs/")({
  component: ElvsPage,
});

type Elv = {
  id: string;
  account_holder: string;
  iban: string;
  bic: string | null;
  bank_name: string | null;
  amount: number;
  shop_id: string;
};

type Shop = { id: string; shop_name: string; accent_color: string };

function ElvsPage() {
  const [search, setSearch] = useState("");

  const { data: elvs = [], isLoading } = useQuery({
    queryKey: ["elvs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elvs")
        .select("id, account_holder, iban, bic, bank_name, amount, shop_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Elv[];
    },
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["shops-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, shop_name, accent_color");
      if (error) throw error;
      return data as Shop[];
    },
  });

  const shopMap = useMemo(() => {
    const m = new Map<string, Shop>();
    shops.forEach((s) => m.set(s.id, s));
    return m;
  }, [shops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return elvs;
    return elvs.filter(
      (e) =>
        e.account_holder.toLowerCase().includes(q) ||
        e.iban.toLowerCase().includes(q),
    );
  }, [elvs, search]);

  return (
    <AdminShell>
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ELVs</h1>
          <p className="text-sm text-slate-500">Gesammelte Lastschrift-Daten</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Nach Kontoinhaber oder IBAN suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Kontoinhaber</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>BIC</TableHead>
                  <TableHead>Bankname</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Shop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Lädt...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Keine Einträge gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => {
                    const shop = shopMap.get(e.shop_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.account_holder}</TableCell>
                        <TableCell className="font-mono text-xs">{e.iban}</TableCell>
                        <TableCell className="font-mono text-xs">{e.bic || "–"}</TableCell>
                        <TableCell>{e.bank_name || "–"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(e.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {shop ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: shop.accent_color }}
                              />
                              <span>{shop.shop_name}</span>
                            </div>
                          ) : (
                            "–"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
