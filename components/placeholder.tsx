"use client";

import { useApp } from "./app-provider";
import { GlassCard } from "./ui";
import type { Key } from "@/lib/i18n";

// Скелет экрана до соответствующего этапа.
export function Placeholder({ title, items }: { title: Key; items: string[] }) {
  const { t } = useApp();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t(title)}</h1>
      {items.map((it) => (
        <GlassCard key={it} className="flex items-center justify-between">
          <span lang="de">{it}</span>
          <span className="text-xs text-violet-300">{t("soon")}</span>
        </GlassCard>
      ))}
    </div>
  );
}
