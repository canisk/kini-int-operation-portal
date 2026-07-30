"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

/** Sends visitors to /modules when signed in, otherwise /login. */
export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? "/modules" : "/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div
        className="w-10 h-10 border-primary/20 border-t-primary rounded-full animate-spin"
        style={{ borderWidth: 3 }}
      />
    </div>
  );
}
