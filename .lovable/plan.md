

## Plan: /auth Seite + /admin Dashboard

### 1. Landing (`src/routes/index.tsx`)
- Unter Tagline „Die Gelddruckmaschine" einen **LETS GO** Button (`#2ed573`, weiße Schrift, fett, Hover-Glow) hinzufügen
- Verlinkt via `<Link to="/auth">` zu Auth-Seite

### 2. Auth-Seite (`src/routes/auth.tsx`)
- **Layout:** Vollbild, `grid grid-cols-1 lg:grid-cols-2`
- **Linke Hälfte (`#2ed573`):**
  - Großes „ELV BOSS" Logo/Wortmarke in Weiß
  - Trust-Elemente (Karten/Icons mit Lucide):
    - „Verifizierte Plattform" (ShieldCheck)
    - „Tägliche Auszahlungen" (Banknote)
    - „1.000+ aktive Boss-Member" (Users)
    - „24/7 Support" (Headphones)
  - Tagline: „Die Gelddruckmaschine"
  - Auf Mobile (<lg): wird oben angezeigt, kompakter
- **Rechte Hälfte (weiß):**
  - Tabs (shadcn `Tabs`): **Login** | **Registrieren**
  - **Login:** Email, Passwort → `signInWithPassword`
  - **Register:** Email, Passwort, Passwort bestätigen → `signUp` mit `emailRedirectTo: window.location.origin + "/admin"`
  - Validation mit `zod` (Email-Format, PW min. 6 Zeichen, PWs müssen übereinstimmen)
  - Error/Success Toast (`sonner`)
  - Bei Erfolg → `navigate({ to: "/admin" })`

### 3. Auth-Setup
- **Supabase:** Email-Auth bereits aktiv. Im Dashboard sollte „Confirm email" deaktiviert werden für sofortigen Login (Hinweis an User).
- **Profiles + Roles Tabellen** (Migration):
  - `profiles` (id uuid PK refs auth.users, email text, created_at)
  - `app_role` enum (`'admin'`)
  - `user_roles` (id, user_id refs auth.users, role app_role, unique(user_id,role))
  - Security-definer Funktion `has_role(_user_id, _role)`
  - Trigger `handle_new_user()` → erstellt Profil + weist automatisch Rolle `'admin'` zu (da nur Admins existieren)
  - RLS: User können eigenes Profil/Rolle lesen
- **Auth-Hook** (`src/hooks/useAuth.tsx`):
  - Context mit `user`, `session`, `loading`, `signOut`
  - `onAuthStateChange` Listener (synchron) + `getSession()` (initial)
  - In `__root.tsx` als Provider gewrappt

### 4. Geschützte Route `/admin` (`src/routes/admin.tsx`)
- In `useEffect` prüfen: kein User → redirect `/auth`
- (Pathless `_authenticated` Layout overkill für eine Route — direkt im Component)

### 5. Admin Dashboard (`src/routes/admin.tsx`)
Modernes Mockup mit shadcn `Sidebar`:
- **Sidebar** (`collapsible="icon"`, Brand-Akzent `#2ed573`):
  - Header: „ELV BOSS" Logo + grünes Akzent-Pill
  - Menü: Dashboard, Einnahmen, Mitglieder, Auszahlungen, Analytics, Einstellungen (Lucide Icons)
  - Footer: User-Email + Logout-Button
- **Topbar:** `SidebarTrigger`, Suchfeld (dummy), Notifications-Icon, Avatar
- **Main-Content (Mockup):**
  - 4 KPI-Karten: Umsatz heute (€12.480), Aktive Member (1.247), Conversion (8.4%), Neue Signups (+47)
  - Großer „Umsatz-Verlauf" Bereich (einfacher SVG/Div-Chart oder `recharts` Area-Chart in `#2ed573`)
  - Tabelle „Letzte Transaktionen" (5 Dummy-Zeilen)
  - Side-Card „Top Performer" (Liste mit Avataren)
- Helles Theme, viel Whitespace, abgerundete Karten, subtile Schatten, Brand-Grün als Akzent

### 6. Technisches
- Neue Files: `src/routes/auth.tsx`, `src/routes/admin.tsx`, `src/hooks/useAuth.tsx`
- Edits: `src/routes/index.tsx` (Button), `src/routes/__root.tsx` (AuthProvider wrap)
- Migration für profiles, user_roles, has_role, trigger
- `recharts` ist vermutlich schon dabei (shadcn chart) — sonst hinzufügen
- `zod` hinzufügen falls nicht vorhanden

### Hinweis an User
Nach Migration in Supabase Auth-Settings **„Confirm email" deaktivieren**, damit Registrierung sofort einloggt.

