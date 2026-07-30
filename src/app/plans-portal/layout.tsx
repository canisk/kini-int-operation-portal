"use client";

import PlansPortalShell from "@/components/PlansPortalShell";
import RequireAuth from "@/components/RequireAuth";

export default function PlansPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <PlansPortalShell>{children}</PlansPortalShell>
    </RequireAuth>
  );
}
