"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard, ProgressRing, ReadinessBar } from "@/components/ui";
import { todayPlan } from "@/lib/cards";
import { planProgress, type Block } from "@/lib/plan";
import { readiness, type AttemptRow, type Readiness } from "@/lib/readiness";
import { supabase } from "@/lib/supabase";
import { Confetti } from "@/components/confetti";
import type { Key } from "@/lib/i18n";

const parts: [string, keyof Readiness][] = [
  ["Hören", "hoeren"],
  ["Lesen", "lesen"],
  ["Schreiben", "schreiben"],
  ["Sprechen", "sprechen"],
  ["LiD", "lid"],
];

const blockMeta: Record<Block["kind"], { key: Key; href?: (b: Block) => string }> = {
  review: { key: "blockReview", href: (b) => `/learn/cards?mode=review&min=${b.minutes}` },
  new: { key: "blockNew", href: (b) => `/learn/cards?mode=new&min=${b.minutes}` },
  speak: { key: "blockSpeak", href: () => "/exam/sprechen?plan=1" },
  write: { key: "blockWrite", href: () => "/exam/schreiben?plan=1" },
  lid: { key: "blockLid", href: () => "/lid/practice?plan=1" },
};

export default function TodayPage() {
  const { t, profile, settings } = useApp();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState("");

  const goal = profile?.daily_minutes;
  useEffect(() => {
    if (!goal) return;
    todayPlan(goal)
      .then((p) => setBlocks(p.blocks))
      .catch((e: Error) => setError(e.message));
  }, [goal]);

  const [ready, setReady] = useState<Readiness | null>(null);
  const [mockDue, setMockDue] = useState(false);
  const [grammar, setGrammar] = useState<{ id: string; title_ru: string; title_uk: string } | null>(null);
  useEffect(() => {
    Promise.all([
      supabase.from("attempts").select("kind, scores, created_at").order("created_at", { ascending: false }).limit(60),
      supabase.from("lid_progress").select("question_id", { count: "exact", head: true }).eq("last_correct", true),
      supabase.from("mock_exams").select("taken_at").eq("kind", "dtz").order("taken_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("error_log").select("type").order("count", { ascending: false }).limit(1).maybeSingle(),
    ]).then(async ([att, lid, mock, err]) => {
      setReady(readiness((att.data as AttemptRow[]) ?? [], lid.count ?? 0));
      setMockDue(!mock.data || Date.now() - Date.parse(mock.data.taken_at) > 7 * 86_400_000);
      if (err.data) {
        const { data } = await supabase.from("grammar_points").select("id, title_ru, title_uk").contains("error_types", [err.data.type]).limit(1).maybeSingle();
        setGrammar(data);
      }
    });
  }, []);

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

      {progress >= 1 && <Confetti />}
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

      {mockDue && (
        <Link href="/exam/mock" className="glass block rounded-3xl p-4 text-fuchsia-200 hover:bg-white/15">
          📝 {t("mockDue")} →
        </Link>
      )}
      {grammar && (
        <Link href={`/learn/grammar?id=${grammar.id}`} className="glass flex justify-between rounded-3xl p-4 hover:bg-white/15">
          <span>📐 {t("grammarOfDay")}: {settings.lang === "ru" ? grammar.title_ru : grammar.title_uk}</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <GlassCard className="space-y-3">
        <h2 className="font-medium">{t("readiness")}</h2>
        {parts.map(([label, k]) => (
          <ReadinessBar key={k} label={label} value={ready?.[k] ?? 0} />
        ))}
      </GlassCard>
    </div>
  );
}
