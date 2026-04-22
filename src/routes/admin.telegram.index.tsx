import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/telegram/")({
  component: TelegramPage,
});

function TelegramPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const sendTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-telegram-notification", {
        body: { test: true },
      });
      if (error) throw error;
      if ((data as any)?.skipped) {
        setResult({
          ok: false,
          msg: "Secrets fehlen serverseitig (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).",
        });
      } else if ((data as any)?.success) {
        setResult({ ok: true, msg: "Test-Nachricht in der Gruppe angekommen ✓" });
      } else {
        setResult({ ok: false, msg: "Unerwartete Antwort: " + JSON.stringify(data) });
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message ?? "Fehler beim Senden" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell>
      <main className="p-4 lg:p-6 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-[#2ed573]" />
            Telegram-Benachrichtigungen
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Alle Bestellungen aus allen Shops gehen automatisch in eine Telegram-Gruppe.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Einrichtung (einmalig)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-slate-700">
            <Step n={1} title="Bot erstellen">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  In Telegram <code className="bg-slate-100 px-1.5 py-0.5 rounded">@BotFather</code>{" "}
                  öffnen → <code className="bg-slate-100 px-1.5 py-0.5 rounded">/newbot</code> →
                  Namen + Username vergeben
                </li>
                <li>
                  Token kopieren → an Lovable-Admin geben (wird als{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code>{" "}
                  Secret gespeichert)
                </li>
              </ul>
            </Step>

            <Step n={2} title="Bot zur Gruppe hinzufügen">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Gruppe öffnen → Gruppenname antippen → „Mitglieder hinzufügen" → nach
                  Bot-Username suchen
                </li>
                <li>
                  Gruppenname antippen → „Administratoren" → Bot zum Admin machen (Recht
                  „Nachrichten senden" reicht)
                </li>
              </ul>
            </Step>

            <Step n={3} title="Group-ID herausfinden">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">@RawDataBot</code> kurz zur
                  Gruppe hinzufügen
                </li>
                <li>
                  Er postet ein JSON — die Zahl bei{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                    "chat":&#123;"id": -1001234567890&#125;
                  </code>{" "}
                  (mit Minus!) ist die Group-ID
                </li>
                <li>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">@RawDataBot</code> wieder
                  entfernen
                </li>
                <li>
                  ID an Lovable-Admin geben (wird als{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">TELEGRAM_CHAT_ID</code>{" "}
                  Secret gespeichert)
                </li>
              </ul>
            </Step>

            <Step n={4} title="Test">
              <p className="mb-3 text-slate-600">
                Wenn die Test-Nachricht in der Gruppe ankommt, ist alles eingerichtet.
              </p>
              <Button
                onClick={sendTest}
                disabled={loading}
                style={{ background: "#2ed573", color: "white" }}
                className="hover:opacity-90"
              >
                <Send className="h-4 w-4" />
                {loading ? "Sende..." : "Test-Nachricht senden"}
              </Button>

              {result && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${
                    result.ok
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{result.msg}</span>
                </div>
              )}
            </Step>
          </CardContent>
        </Card>
      </main>
    </AdminShell>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
        style={{ background: "#2ed573" }}
      >
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 mb-1.5">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
