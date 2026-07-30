"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { DEMO_EMAIL, DEMO_PASSWORD, setAuthenticated } from "@/lib/auth";

export { isAuthenticated, setAuthenticated } from "@/lib/auth";
export { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/auth";

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Simulated check — prototype only, no real auth backend
    window.setTimeout(() => {
      const emailOk = email.trim().toLowerCase() === DEMO_EMAIL;
      const passwordOk = password === DEMO_PASSWORD;

      if (emailOk && passwordOk) {
        setAuthenticated(true);
        onSuccess();
      } else {
        setError("Invalid email or password.");
        setSubmitting(false);
      }
    }, 400);
  };

  return (
    <div
      className="min-h-screen font-[Plus_Jakarta_Sans,sans-serif] flex flex-col overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #f4f5fb 0%, #eceefb 45%, #f8e8ef 100%)" }}
    >
      <div
        className="shrink-0 px-6 sm:px-8 py-1.5 sm:py-2.5 text-center text-[10px] sm:text-xs font-semibold text-amber-950 leading-snug"
        style={{ background: "#fef3c7", borderBottom: "1px solid #f59e0b" }}
      >
        <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Internal prototype only — not a customer product. Demo data. Do not share publicly.
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-6 sm:py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-5 sm:mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-kini.png"
              alt="kini mobile"
              className="h-10 sm:h-14 w-auto mx-auto mb-3 sm:mb-4"
            />
            <h1 className="text-lg sm:text-xl font-extrabold text-foreground">Operations Portal</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Sign in to choose a module</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-muted text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-muted text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Internal prototype only. Plan data is sample only.
          </p>
        </div>
      </div>
    </div>
  );
}
