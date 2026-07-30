"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { setAuthenticated } from "@/lib/auth";
import type { AppTab } from "@/lib/types";

const NAV_ITEMS: { id: AppTab; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", href: "/plans-portal/dashboard", icon: LayoutDashboard },
  { id: "all-plans", label: "All Plans", href: "/plans-portal/all-plans", icon: List },
];

function tabFromPath(pathname: string): AppTab {
  if (pathname.includes("/all-plans")) return "all-plans";
  return "dashboard";
}

function NavButtons({
  tab,
  onNavigate,
}: {
  tab: AppTab;
  onNavigate: (href: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.href)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
              active
                ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                : "text-foreground hover:bg-card hover:shadow-sm font-medium"
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? "text-white/80" : "text-primary"}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Shared chrome for /plans-portal/* */
export default function PlansPortalShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabFromPath(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarOpen((open) => !open);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-background font-[Plus_Jakarta_Sans,sans-serif] flex flex-col">
      <div
        className="shrink-0 px-6 sm:px-8 py-1 text-center text-[10px] sm:text-[11px] font-semibold text-amber-950 leading-snug"
        style={{ background: "#fef3c7", borderBottom: "1px solid #f59e0b" }}
      >
        Internal prototype · Demo data only · Not for customer or public use
      </div>

      <header className="sticky top-0 z-40 shrink-0 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/modules")}
              className="flex items-center gap-2 sm:gap-3 min-w-0 text-left hover:opacity-90 transition-opacity"
              title="Back to modules"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-kini.png" alt="kini mobile" className="h-8 sm:h-12 w-auto shrink-0" />
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-muted-foreground text-xs tracking-wide">Plans Portal</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "#fe175b" }}
                >
                  Prototype
                </span>
              </div>
            </button>
            <div className="hidden md:block h-6 w-px bg-border shrink-0" aria-hidden />
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
              aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
              title={sidebarOpen ? "Hide side nav" : "Show side nav"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/modules")}
              className="hidden sm:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-border bg-card text-[10px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Back to modules"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modules</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground text-[10px] sm:text-xs">API Online (mock)</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-border bg-card text-[10px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full min-w-0">
        <aside
          className={`hidden md:flex flex-col shrink-0 border-r border-border bg-white/60 sticky top-12 sm:top-16 self-start min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-4rem)] overflow-hidden transition-[width,padding] duration-200 ease-out ${
            sidebarOpen ? "w-56 px-3 py-5" : "w-0 px-0 py-5 pointer-events-none"
          }`}
          aria-hidden={!sidebarOpen}
        >
          <div className="w-[12.5rem] shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Navigate
            </p>
            <NavButtons tab={tab} onNavigate={(href) => router.push(href)} />
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="w-full max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/25"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(16rem,85vw)] bg-background border-r border-border shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between gap-2 px-4 h-12 border-b border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Navigate
              </p>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <NavButtons
                tab={tab}
                onNavigate={(href) => {
                  setMobileNavOpen(false);
                  router.push(href);
                }}
              />
            </div>
          </aside>
        </div>
      )}

      <footer className="shrink-0 border-t border-border bg-white/70 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © 2026 Kin Innovation. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Internal prototype · Sample data only · Not for customer use
          </p>
        </div>
      </footer>
    </div>
  );
}
