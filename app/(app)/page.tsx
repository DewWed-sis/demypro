"use client";

import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard, ProgressRing, ReadinessBar } from "@/components/ui";

const parts = ["Hören", "Lesen", "Schreiben", "Sprechen", "LiD"];

export default function TodayPage() {
  const { t, profile } = useApp();
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("today")}</h1>
        <span className="glass rounded-2xl px-3 py-1 text-sm" title={t("streak")}>
          🔥 {profile?.streak ?? 0} {t("days")}
        </span>
      </header>

      <GlassCard className="flex flex-col items-center gap-5 py-8">
        <ProgressRing value={0} label={t("dayProgress")} />
        <GlassButton variant="primary" className="w-full" disabled title={t("soon")}>
          {t("startSession")}
        </GlassButton>
        <p className="text-xs text-violet-200">
          {profile?.daily_minutes ?? 35} мин · {profile?.level ?? "A1"}
        </p>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="font-medium">{t("readiness")}</h2>
        {parts.map((p) => (
          <ReadinessBar key={p} label={p} value={0} />
        ))}
      </GlassCard>
    </div>
  );
}
