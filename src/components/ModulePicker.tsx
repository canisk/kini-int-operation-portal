"use client";

import { ArrowRight, LayoutGrid, LogOut, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { setAuthenticated } from "@/lib/auth";

interface ModuleDef {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: typeof Package;
  available: boolean;
}

const MODULES: ModuleDef[] = [
  {
    id: "plans",
    name: "Plans Portal",
    description: "Browse and review plan catalogue data.",
    href: "/plans-portal/dashboard",
    icon: Package,
    available: true,
  },
];

export default function ModulePicker() {
  const router = useRouter();

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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/modules")}
              className="flex items-center gap-2 sm:gap-3 min-w-0 text-left hover:opacity-90 transition-opacity"
              title="Modules"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-kini.png" alt="kini mobile" className="h-8 sm:h-12 w-auto shrink-0" />
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-muted-foreground text-xs tracking-wide">kini Operations Portal</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "#fe175b" }}
                >
                  Prototype
                </span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-8 py-4 sm:py-6">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-2">
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Modules</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">Choose a module</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
            Pick a module to get started.
          </p>
        </div>

        <ul className="space-y-3 max-w-xl mx-auto">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <li key={mod.id}>
                <button
                  type="button"
                  disabled={!mod.available}
                  onClick={() => router.push(mod.href)}
                  className="w-full group flex items-center gap-4 text-left bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold text-foreground">{mod.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{mod.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="shrink-0 border-t border-border bg-white/70 mt-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
