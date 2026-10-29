"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GlassCard } from "@/components/ui";
import { dueCount } from "@/lib/cards";
import { supabase } from "@/lib/supabase";

type Lesson = { id: string; title_ru: string; title_uk: string; kind: string };

export default function LearnPage() {
  const { t, settings } = useApp();
  const [due, setDue] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    dueCount().then(setDue);
    supabase
      .from("lessons")
      .select("id, title_ru, title_uk, kind")
      .neq("id", "a1-start-alphabet")
      .order("sort")
      .then(({ data }) => setLessons(data ?? []));
  }, []);

  const row = "glass flex items-center justify-between rounded-3xl p-5 transition hover:bg-white/15";

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("learn")}</h1>

      <Link href="/learn/cards?mode=review" className={row}>
        <span>{t("review")}</span>
        <span className="text-sm text-violet-200">
          {due ?? "…"} {t("dueNow")}
        </span>
      </Link>
      <Link href="/learn/cards?mode=new" className={row}>
        <span>{t("newCards")}</span>
        <span aria-hidden>→</span>
      </Link>
      <Link href="/learn/alphabet" className={row}>
        <span>{t("alphabet")}</span>
        <span lang="de" className="text-violet-200">
          Ä Ö Ü ß
        </span>
      </Link>

      <Link href="/learn/shadowing" className={row}>
        <span>{t("shadowing")}</span>
        <span aria-hidden>🎙</span>
      </Link>

      {lessons.length > 0 && (
        <GlassCard className="space-y-1 p-3">
          {lessons.map((l) => (
            <Link
              key={l.id}
              href={`/learn/cards?mode=new&lesson=${l.id}`}
              className="flex justify-between rounded-2xl px-3 py-2.5 hover:bg-white/10"
            >
              <span>{settings.lang === "ru" ? l.title_ru : l.title_uk}</span>
              <span className="text-xs text-violet-300">{l.id.slice(0, 2).toUpperCase()}</span>
            </Link>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
