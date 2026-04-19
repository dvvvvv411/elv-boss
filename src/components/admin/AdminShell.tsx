import { type ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Users,
  ArrowDownToLine,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Store,
  ShoppingCart,
  Landmark,
  CreditCard,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const BRAND = "#2ed573";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, to: "/admin" as const },
  { title: "Shops", icon: Store, to: "/admin/shops" as const },
  { title: "Bestellungen", icon: ShoppingCart, to: "/admin/orders" as const },
  { title: "ELVs", icon: Landmark, to: "/admin/elvs" as const },
  { title: "Kreditkarten", icon: CreditCard, to: "/admin/kreditkarten" as const },
  { title: "Einnahmen", icon: Wallet, to: "/admin" as const, disabled: true },
  { title: "Mitglieder", icon: Users, to: "/admin" as const, disabled: true },
  { title: "Auszahlungen", icon: ArrowDownToLine, to: "/admin" as const, disabled: true },
  { title: "Analytics", icon: BarChart3, to: "/admin" as const, disabled: true },
  { title: "Einstellungen", icon: Settings, to: "/admin" as const, disabled: true },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar email={user.email ?? ""} onLogout={signOut} />
        <SidebarInset className="bg-slate-50">
          <Topbar email={user.email ?? ""} />
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ email, onLogout }: { email: string; onLogout: () => Promise<void> }) {
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (to: string) => {
    if (to === "/admin") return pathname === "/admin";
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-slate-200">
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold"
            style={{ background: BRAND }}
          >
            E
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-slate-900 leading-tight">ELV BOSS</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: BRAND }}
            >
              Admin
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = !item.disabled && isActive(item.to);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      isActive={active}
                      tooltip={item.title}
                      className="data-[active=true]:text-white"
                      style={active ? { background: BRAND } : undefined}
                      disabled={item.disabled}
                    >
                      {item.disabled ? (
                        <>
                          <item.icon />
                          <span>{item.title}</span>
                        </>
                      ) : (
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200">
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ background: BRAND, color: "white" }}>
              {email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-900 truncate">{email}</div>
            <div className="text-[10px] text-slate-500">Administrator</div>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Abmelden" onClick={onLogout}>
              <LogOut />
              <span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function Topbar({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <SidebarTrigger className="text-slate-600" />
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Suchen..." className="pl-9 bg-slate-50 border-slate-200" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-600" />
          <span
            className="absolute top-2 right-2 h-2 w-2 rounded-full"
            style={{ background: BRAND }}
          />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback style={{ background: BRAND, color: "white" }}>
            {email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
