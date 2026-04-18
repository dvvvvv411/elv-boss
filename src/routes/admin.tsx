import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

const BRAND = "#2ed573";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard – ELV BOSS" },
      { name: "description", content: "ELV BOSS Admin Dashboard." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <AdminShell>
      <DashboardContent />
    </AdminShell>
  );
}

const kpis = [
  { label: "Umsatz heute", value: "€12.480", change: "+12.4%", up: true },
  { label: "Aktive Member", value: "1.247", change: "+34", up: true },
  { label: "Conversion", value: "8.4%", change: "+0.6%", up: true },
  { label: "Neue Signups", value: "+47", change: "-3", up: false },
];

const chartData = [
  { day: "Mo", value: 4200 },
  { day: "Di", value: 5800 },
  { day: "Mi", value: 5100 },
  { day: "Do", value: 7200 },
  { day: "Fr", value: 9400 },
  { day: "Sa", value: 11200 },
  { day: "So", value: 12480 },
];

const transactions = [
  { user: "Max M.", email: "max@example.com", amount: "€349", status: "Erfolgreich", time: "vor 2 Min" },
  { user: "Lena K.", email: "lena@example.com", amount: "€129", status: "Erfolgreich", time: "vor 18 Min" },
  { user: "Tom B.", email: "tom@example.com", amount: "€599", status: "Ausstehend", time: "vor 32 Min" },
  { user: "Sara P.", email: "sara@example.com", amount: "€249", status: "Erfolgreich", time: "vor 1 Std" },
  { user: "Jonas R.", email: "jonas@example.com", amount: "€89", status: "Erfolgreich", time: "vor 2 Std" },
];

const topPerformers = [
  { name: "Marcel Weiß", earnings: "€8.420", initials: "MW" },
  { name: "Julia Klein", earnings: "€6.190", initials: "JK" },
  { name: "Daniel Berg", earnings: "€5.730", initials: "DB" },
  { name: "Anna Schulz", earnings: "€4.880", initials: "AS" },
];

function DashboardContent() {
  return (
    <div className="flex-1 p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Willkommen zurück – hier dein Überblick.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5 border-slate-200 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{k.value}</div>
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${k.up ? "text-emerald-600" : "text-rose-600"}`}>
              {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {k.change}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Umsatz-Verlauf</h2>
              <p className="text-xs text-slate-500">Letzte 7 Tage</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Gesamt</div>
              <div className="text-lg font-bold text-slate-900">€55.380</div>
            </div>
          </div>
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="brandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={BRAND}
                  strokeWidth={2.5}
                  fill="url(#brandFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-900">Top Performer</h2>
          <p className="text-xs text-slate-500">Diese Woche</p>
          <div className="mt-4 space-y-3">
            {topPerformers.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="text-xs font-bold text-slate-400 w-4">{i + 1}</div>
                <Avatar className="h-9 w-9">
                  <AvatarFallback style={{ background: BRAND, color: "white" }}>
                    {p.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500">Boss-Member</div>
                </div>
                <div className="text-sm font-semibold" style={{ color: BRAND }}>
                  {p.earnings}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Letzte Transaktionen</h2>
            <p className="text-xs text-slate-500">Aktuelle Zahlungseingänge</p>
          </div>
          <Button variant="outline" size="sm">Alle anzeigen</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="pb-3 font-medium">Member</th>
                <th className="pb-3 font-medium">Betrag</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Zeit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.email} className="hover:bg-slate-50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-xs">
                          {t.user.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-900">{t.user}</div>
                        <div className="text-xs text-slate-500">{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-slate-900">{t.amount}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === "Erfolgreich"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-500">{t.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
