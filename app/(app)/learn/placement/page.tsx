"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { clozeAnswer } from "@/lib/readiness";

const LEVELS = ["A1", "A2", "B1"] as const;
type Level = (typeof LEVELS)[number];
type Q = { id: string; native: string; cloze: string; options: string[]; answer: string };
const N = 15;
const PASS = 12;
const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/** Входной тест уровня: фраза с пропуском + 3 варианта из слов того же уровня. */
function Placement() {
  const raw = useSearchParams().get("level");
  const level: Level = LEVELS.includes(raw as Level) ? (raw as Level) : "A1";
  const { t, settings, profile, updateProfile } = useApp();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("content_items")
      .select("id, de, ru, uk, cloze")
      .eq("level_id", level)
      .not("cloze", "is", null)
      .then(({ data }) => {
        const rows = (data ?? []).map((r) => ({ ...r, gap: clozeAnswer(r.de, r.cloze!) }));
        const pool = [...new Set(rows.map((r) => r.gap))];
        setQs(
          shuffle(rows).slice(0, N).map((r) => ({
            id: r.id,
            native: r[settings.lang],
            cloze: r.cloze!,
            answer: r.gap,
            options: shuffle([r.gap, ...shuffle(pool.filter((w) => w !== r.gap)).slice(0, 2)]),
          })),
        );
      });
  }, [level, settings.lang]);

  if (!qs) return <p className="text-violet-200">{t("loading")}</p>;
  const q = qs[i];
  const next = LEVELS[LEVELS.indexOf(level) + 1];

  if (!q) {
    const pass = score >= PASS;
    return (
      <GlassCard className="space-y-4 text-center">
        <div className="text-3xl font-semibold">{score} / {qs.length}</div>
        <p>{pass ? t("placementPass") : t("placementFail")}</p>
        {pass && next && profile && LEVELS.indexOf(profile.level) < LEVELS.indexOf(next) && (
          <GlassButton variant="primary" onClick={() => updateProfile({ level: next })}>
            {t("skipTo")} {next}
          </GlassButton>
        )}
        {profile && <p className="text-sm text-violet-200">{t("yourLevel")}: {profile.level}</p>}
        <Link href="/learn" className="inline-block text-violet-200 underline">← {t("learn")}</Link>
      </GlassCard>
    );
  }

  function choose(o: string) {
    if (picked) return;
    setPicked(o);
    if (o === q.answer) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setI((n) => n + 1);
    }, 900);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-violet-200">
        <span>{t("placement")} {level}</span>
        <span>{i + 1} / {qs.length}</span>
      </div>
      <GlassCard className="space-y-3 text-center">
        <p className="text-violet-200">{q.native}</p>
        <p lang="de" className="text-xl">{q.cloze}</p>
      </GlassCard>
      <div className="grid gap-2">
        {q.options.map((o) => (
          <GlassButton
            key={o}
            lang="de"
            onClick={() => choose(o)}
            className={picked ? (o === q.answer ? "!border-ok !bg-ok/25" : o === picked ? "!border-err !bg-err/25" : "") : ""}
          >
            {o}
          </GlassButton>
        ))}
      </div>
    </div>
  );
}

export default function PlacementPage() {
  return (
    <Suspense>
      <Placement />
    </Suspense>
  );
}
