"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { GlassCard } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { speak } from "@/lib/audio";

type G = {
  id: string;
  level_id: string;
  title_ru: string;
  title_uk: string;
  rule_ru: string;
  rule_uk: string;
  examples: { de: string; ru: string; uk: string }[];
  quiz: { q: string; options: string[]; answer: number }[];
  error_types: string[];
};

function Quiz({ quiz }: { quiz: G["quiz"] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <div className="space-y-3">
      {quiz.map((q, i) => (
        <div key={i} className="space-y-2">
          <p lang="de">{q.q}</p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o, oi) => {
              const p = picked[i];
              const cls = p === undefined ? "" : oi === q.answer ? "!border-ok !bg-ok/25" : oi === p ? "!border-err !bg-err/25" : "";
              return (
                <button key={oi} type="button" lang="de" disabled={p !== undefined} onClick={() => setPicked({ ...picked, [i]: oi })} className={`glass rounded-2xl px-3 py-1.5 text-sm ${cls}`}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Грамматика короткими карточками: правило, 3 живых примера, мини-тест. Сверху — темы по ошибкам из тетради. */
function Grammar() {
  const id = useSearchParams().get("id");
  const { t, settings } = useApp();
  const [all, setAll] = useState<G[]>([]);
  const [mine, setMine] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("grammar_points").select("*").order("sort").then(({ data }) => setAll((data as G[]) ?? []));
    supabase.from("error_log").select("type, count").then(({ data }) => {
      const sum: Record<string, number> = {};
      for (const r of data ?? []) sum[r.type] = (sum[r.type] ?? 0) + r.count;
      setMine(Object.entries(sum).sort((a, b) => b[1] - a[1]).map(([k]) => k));
    });
  }, []);

  const L = settings.lang;
  const g = all.find((x) => x.id === id);

  if (g)
    return (
      <div className="space-y-4">
        <Link href="/learn/grammar" className="text-sm text-violet-200 underline">← {t("grammar")}</Link>
        <h1 className="text-2xl font-semibold">{L === "ru" ? g.title_ru : g.title_uk}</h1>
        <GlassCard>{L === "ru" ? g.rule_ru : g.rule_uk}</GlassCard>
        <GlassCard className="space-y-2">
          <h2 className="text-sm text-violet-200">{t("examples")}</h2>
          {g.examples.map((e) => (
            <button key={e.de} type="button" onClick={() => speak(e.de)} className="block w-full rounded-2xl px-2 py-1 text-left hover:bg-white/10">
              <span lang="de" className="block">🔊 {e.de}</span>
              <span className="text-sm text-violet-300">{e[L]}</span>
            </button>
          ))}
        </GlassCard>
        <GlassCard className="space-y-2">
          <h2 className="text-sm text-violet-200">{t("miniTest")}</h2>
          <Quiz key={g.id} quiz={g.quiz} />
        </GlassCard>
      </div>
    );

  const rank = (x: G) => Math.min(...x.error_types.map((e) => (mine.includes(e) ? mine.indexOf(e) : 99)));
  const forYou = all.filter((x) => rank(x) < 99).sort((a, b) => rank(a) - rank(b));
  const row = (x: G) => (
    <Link key={x.id} href={`/learn/grammar?id=${x.id}`} className="flex justify-between rounded-2xl px-3 py-2.5 hover:bg-white/10">
      <span>{L === "ru" ? x.title_ru : x.title_uk}</span>
      <span className="text-xs text-violet-300">{x.level_id}</span>
    </Link>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("grammar")}</h1>
      {forYou.length > 0 && (
        <GlassCard className="space-y-1 p-3">
          <h2 className="px-3 text-sm text-violet-200">{t("grammarForYou")}</h2>
          {forYou.map(row)}
        </GlassCard>
      )}
      <GlassCard className="space-y-1 p-3">{all.map(row)}</GlassCard>
    </div>
  );
}

export default function GrammarPage() {
  return (
    <Suspense>
      <Grammar />
    </Suspense>
  );
}
