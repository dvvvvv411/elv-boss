import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast, Toaster } from "sonner";
import { ShieldCheck, Banknote, Users, Headphones, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BRAND = "#2ed573";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login & Registrierung – ELV BOSS" },
      { name: "description", content: "Logge dich ein oder registriere dich bei ELV BOSS." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Ungültige E-Mail-Adresse" }).max(255),
  password: z.string().min(6, { message: "Passwort muss mindestens 6 Zeichen haben" }).max(128),
});

const registerSchema = z
  .object({
    email: z.string().trim().email({ message: "Ungültige E-Mail-Adresse" }).max(255),
    password: z.string().min(6, { message: "Passwort muss mindestens 6 Zeichen haben" }).max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

const trustItems = [
  { icon: ShieldCheck, title: "Verifizierte Plattform", desc: "Sicher & geprüft" },
  { icon: Banknote, title: "Tägliche Auszahlungen", desc: "Geld in Echtzeit" },
  { icon: Users, title: "1.000+ Boss-Member", desc: "Wachsende Community" },
  { icon: Headphones, title: "24/7 Support", desc: "Immer für dich da" },
];

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/admin" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="relative">
      <Toaster richColors position="top-center" />
      <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white">
        {/* LEFT: Brand panel */}
      <aside
        className="relative flex flex-col justify-between p-8 lg:p-12 text-white min-h-[40vh] lg:min-h-screen"
        style={{ background: BRAND }}
      >
        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl lg:text-6xl font-bold tracking-[0.06em]">ELV BOSS</h1>
          <p className="mt-3 text-xs lg:text-sm font-medium uppercase tracking-[0.35em] text-white/85">
            Die Gelddruckmaschine
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {trustItems.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">{title}</div>
                  <div className="text-sm text-white/80">{desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-xs text-white/70 mt-8">
          © {new Date().getFullYear()} ELV BOSS · Alle Rechte vorbehalten
        </div>
      </aside>

      {/* RIGHT: Auth panel */}
      <section className="min-h-screen flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold text-slate-900">
            {mode === "login" ? "Willkommen zurück" : "Account erstellen"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login"
              ? "Logge dich ein, um zu deinem Dashboard zu gelangen."
              : "Erstelle deinen Account und leg sofort los."}
          </p>

          <div className="mt-8">
            {mode === "login" ? <LoginForm /> : <RegisterForm />}
          </div>

          <p className="mt-6 text-sm text-slate-500 text-center">
            {mode === "login" ? (
              <>
                Noch keinen Account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-semibold hover:underline"
                  style={{ color: BRAND }}
                >
                  Jetzt registrieren
                </button>
              </>
            ) : (
              <>
                Schon dabei?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-semibold hover:underline"
                  style={{ color: BRAND }}
                >
                  Einloggen
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
    </>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Erfolgreich eingeloggt");
    navigate({ to: "/admin" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">E-Mail</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Passwort</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full text-white font-semibold hover:opacity-90"
        style={{ background: BRAND }}
      >
        {submitting ? "Wird geprüft..." : "Einloggen"}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ email, password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account erstellt – willkommen!");
    navigate({ to: "/admin" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-email">E-Mail</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">Passwort</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-confirm">Passwort bestätigen</Label>
        <Input
          id="reg-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full text-white font-semibold hover:opacity-90"
        style={{ background: BRAND }}
      >
        {submitting ? "Wird erstellt..." : "Account erstellen"}
      </Button>
    </form>
  );
}
