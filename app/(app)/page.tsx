"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard, ProgressRing, ReadinessBar } from "@/components/ui";
import { todayPlan } from "@/lib/cards";
import { planProgress, type Block } from "@/lib/plan";
import type { Key } from "@/lib/i18n";

const parts = ["Hören", "Lesen", "Schreiben", "Sprechen", "LiD"];

const blockMeta: Record<Block["kind"], { key: Key; href?: (b: Block) => string }> = {
  review: { key: "blockReview", href: (b) => `/learn/cards?mode=review&min=${b.minutes}` },
  new: { key: "blockNew", href: (b) => `/learn/cards?mode=new&min=${b.minutes}` },
  speak: { key: "blockSpeak" },
  write: { key: "blockWrite" },
  lid: { key: "blockLid" },
};

export default function TodayPage() {
  const { t, profile } = useApp();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState("");

  const goal = profile?.daily_minutes;
  useEffect(() => {
    if (!goal) return;
    todayPlan(goal)
      .then((p) => setBlocks(p.blocks))
      .catch((e: Error) => setError(e.message));
  }, [goal]);

  const progress = blocks ? planProgress(blocks) : 0;
  const next = blocks?.find((b) => !b.done && blockMeta[b.kind].href);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("today")}</h1>
        <span className="glass rounded-2xl px-3 py-1 text-sm" title={t("streak")}>
          🔥 {profile?.streak ?? 0} {t("days")}
        </span>
      </header>

      <GlassCard className="flex flex-col items-center gap-5 py-8">
        <ProgressRing value={progress} label={t("dayProgress")} />
        {progress >= 1 ? (
          <p className="text-ok">{t("dayDone")}</p>
        ) : next ? (
          <Link href={blockMeta[next.kind].href!(next)} className="w-full">
            <GlassButton variant="primary" className="w-full">
              {t("startSession")}
            </GlassButton>
          </Link>
        ) : (
          <GlassButton variant="primary" className="w-full" disabled>
            {t("startSession")}
          </GlassButton>
        )}
        {error && <p className="text-sm text-err">{error}</p>}
      </GlassCard>

      {blocks && (
        <GlassCard className="space-y-1 p-3">
          {blocks.map((b) => {
            const meta = blockMeta[b.kind];
            const body = (
              <>
                <span className={b.done ? "text-ok" : ""}>
                  {b.done ? "✓ " : ""}
                  {t(meta.key)}
                </span>
                <span className="text-sm text-violet-200">
                  {meta.href ? `${b.minutes} ${t("min")}` : t("soon")}
                </span>
              </>
            );
            const cls = "flex items-center justify-between rounded-2xl px-3 py-2.5";
            return meta.href && !b.done ? (
              <Link key={b.kind} href={meta.href(b)} className={`${cls} hover:bg-white/10`}>
                {body}
              </Link>
            ) : (
              <div key={b.kind} className={`${cls} ${meta.href ? "" : "opacity-60"}`}>
                {body}
              </div>
            );
          })}
        </GlassCard>
      )}

      <GlassCard className="space-y-3">
        <h2 className="font-medium">{t("readiness")}</h2>
        {parts.map((p) => (
          <ReadinessBar key={p} label={p} value={0} />
        ))}
      </GlassCard>
    </div>
  );
}
