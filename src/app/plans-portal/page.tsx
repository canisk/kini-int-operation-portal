"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlansPortalIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/plans-portal/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="w-10 h-10 border-primary/20 border-t-primary rounded-full animate-spin"
        style={{ borderWidth: 3 }}
      />
    </div>
  );
}
