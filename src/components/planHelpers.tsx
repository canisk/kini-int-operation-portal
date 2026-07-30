"use client";

import { Globe, Smartphone, Zap } from "lucide-react";

export function categoryIcon(cat: string) {
  const cls = "w-4 h-4";
  const key = cat.toLowerCase();
  if (key === "prepaid") return <Zap className={cls} />;
  if (key === "postpaid") return <Smartphone className={cls} />;
  if (key === "addon" || key === "add-on") return <Globe className={cls} />;
  return <Smartphone className={cls} />;
}
