"use client";

import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import type { AppTab } from "@/lib/types";

const TAB_HREF: Record<AppTab, string> = {
  dashboard: "/plans-portal/dashboard",
  "all-plans": "/plans-portal/all-plans",
};

export default function PlansDashboardPage() {
  const router = useRouter();

  return (
    <Dashboard onNavigate={(tab) => router.push(TAB_HREF[tab])} />
  );
}
