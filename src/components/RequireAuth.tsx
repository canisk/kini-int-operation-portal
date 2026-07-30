"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

/** Client-side gate — redirects to /login when not signed in. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="w-10 h-10 border-primary/20 border-t-primary rounded-full animate-spin"
          style={{ borderWidth: 3 }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
