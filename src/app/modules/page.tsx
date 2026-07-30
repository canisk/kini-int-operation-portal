"use client";

import ModulePicker from "@/components/ModulePicker";
import RequireAuth from "@/components/RequireAuth";

export default function ModulesPage() {
  return (
    <RequireAuth>
      <ModulePicker />
    </RequireAuth>
  );
}
