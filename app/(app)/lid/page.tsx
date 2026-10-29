"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GlassCard, ReadinessBar } from "@/components/ui";
import { LID_TOPICS, topicStats } from "@/lib/lid";

type Stats = Awaited<ReturnType<typeof topicStats>>;

export default function LidPage() {
  const { t } = useApp();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    topicStats().then(setS);
  }, []);

  const row = "glass flex items-center justify-between rounded-3xl p-5 transition hover:bg-white/15";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold" lang="de">
          {t("lidTitle")}
        </h1>
        <p className="text-sm text-violet-200">{t("lidSub")}</p>
      </div>

      {s && (
        <GlassCard>
          <ReadinessBar label={`${s.learned} / ${s.total} ${t("learned")}`} value={s.total ? s.learned / s.total : 0} />
        </GlassCard>
      )}

      <Link href="/lid/test" className={`${row} bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30`}>
        <span>{t("mockTest")}</span>
        <span aria-hidden>→</span>
      </Link>
      <Link href="/lid/practice?mode=mistakes" className={row}>
        <span>{t("mistakesOnly")}</span>
        <span className="text-sm text-err">{s?.mistakes ?? "…"}</span>
      </Link>
      <Link href="/lid/practice" className={row}>
        <span>{t("allQuestions")}</span>
        <span className="text-sm text-violet-200">310</span>
      </Link>

      <GlassCard className="space-y-1 p-3">
        <h2 className="px-3 pt-1 text-sm text-violet-200">{t("byTopic")}</h2>
        {LID_TOPICS.map((topic) => (
          <Link key={topic} href={`/lid/practice?topic=${topic}`} className="flex justify-between rounded-2xl px-3 py-2.5 hover:bg-white/10">
            <span>{t(`topic_${topic}`)}</span>
            <span className="text-xs text-violet-300">
              {s ? `${s.stats[topic].ok} / ${s.stats[topic].total}` : ""}
            </span>
          </Link>
        ))}
      </GlassCard>
    </div>
  );
}
