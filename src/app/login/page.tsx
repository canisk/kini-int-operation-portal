"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Login from "@/components/Login";
import { isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/modules");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div
          className="w-10 h-10 border-primary/20 border-t-primary rounded-full animate-spin"
          style={{ borderWidth: 3 }}
        />
      </div>
    );
  }

  return <Login onSuccess={() => router.replace("/modules")} />;
}
