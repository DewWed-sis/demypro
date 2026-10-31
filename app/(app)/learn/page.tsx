"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GlassCard } from "@/components/ui";
import { dueCount } from "@/lib/cards";
import { supabase } from "@/lib/supabase";

type Lesson = { id: string; title_ru: string; title_uk: string; kind: string; level_id: string };
const LEVELS = ["A1", "A2", "B1"] as const;

export default function LearnPage() {
  const { t, settings, profile } = useApp();
  const [due, setDue] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    dueCount().then(setDue);
    supabase
      .from("lessons")
      .select("id, title_ru, title_uk, kind, level_id")
      .neq("id", "a1-start-alphabet")
      .order("sort")
      .then(({ data }) => setLessons(data ?? []));
  }, []);

  const row = "glass flex items-center justify-between rounded-3xl p-5 transition hover:bg-white/15";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("learn")}</h1>
        {profile && <span className="glass rounded-2xl px-3 py-1 text-sm">{t("yourLevel")}: {profile.level}</span>}
      </div>

      <Link href="/learn/cards?mode=review" className={row}>
        <span>{t("review")}</span>
        <span className="text-sm text-violet-200">{due ?? "…"} {t("dueNow")}</span>
      </Link>
      <Link href="/learn/cards?mode=new" className={row}>
        <span>{t("newCards")}</span>
        <span aria-hidden>→</span>
      </Link>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/learn/games" className={`${row} col-span-2 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30`}>
          <span><span className="block font-medium">🎮 {t("games")}</span><span className="text-sm text-violet-200">{t("gamesHint")}</span></span>
          <span aria-hidden>→</span>
        </Link>
        <Link href="/learn/dictionary" className={`${row} col-span-2`}><span>📖 {t("dictionary")}</span><span className="text-sm text-violet-200">{t("dictSearch")} →</span></Link>
        <Link href="/learn/shadowing" className={row}><span>{t("shadowing").split(":")[0]}</span><span aria-hidden>🎙</span></Link>
        <Link href="/learn/errors" className={row}><span>{t("errorNotebook")}</span><span aria-hidden>📒</span></Link>
        <Link href="/learn/grammar" className={row}><span>{t("grammar")}</span><span aria-hidden>📐</span></Link>
        <Link href="/learn/alphabet" className={row}><span>{t("alphabet").split(" ")[0]}</span><span lang="de" className="text-violet-200">Ä Ö Ü</span></Link>
      </div>

      {LEVELS.map((lv) => {
        const list = lessons.filter((l) => l.level_id === lv);
        if (!list.length) return null;
        return (
          <GlassCard key={lv} className="space-y-1 p-3">
            <div className="flex items-center justify-between px-3 pb-1">
              <h2 className="font-medium">{lv}</h2>
              <Link href={`/learn/placement?level=${lv}`} className="text-sm text-violet-200 underline">{t("placement")}</Link>
            </div>
            {list.map((l) => (
              <Link key={l.id} href={`/learn/cards?mode=new&lesson=${l.id}`} className="flex justify-between rounded-2xl px-3 py-2.5 hover:bg-white/10">
                <span>{settings.lang === "ru" ? l.title_ru : l.title_uk}</span>
                <span aria-hidden className="text-violet-300">→</span>
              </Link>
            ))}
          </GlassCard>
        );
      })}
    </div>
  );
}
