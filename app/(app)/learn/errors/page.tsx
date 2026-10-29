"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GlassCard } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { speak } from "@/lib/audio";

type Row = { id: string; type: string; example: string; correction: string; rule_ru: string | null; rule_uk: string | null; count: number };
type Grammar = { id: string; error_types: string[] };

/** Тетрадь ошибок: группы по типу, частые сверху; из группы — ссылка на мини-урок грамматики. */
export default function ErrorsPage() {
  const { t, settings } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [grammar, setGrammar] = useState<Grammar[]>([]);

  useEffect(() => {
    supabase
      .from("error_log")
      .select("id, type, example, correction, rule_ru, rule_uk, count")
      .order("count", { ascending: false })
      .order("last_seen", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
    supabase.from("grammar_points").select("id, error_types").then(({ data }) => setGrammar(data ?? []));
  }, []);

  if (!rows) return <p className="text-violet-200">{t("loading")}</p>;

  const groups = Object.entries(
    rows.reduce<Record<string, Row[]>>((acc, r) => ((acc[r.type] ??= []).push(r), acc), {}),
  ).sort((a, b) => b[1].reduce((s, r) => s + r.count, 0) - a[1].reduce((s, r) => s + r.count, 0));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("errorNotebook")}</h1>
      {groups.length === 0 && <GlassCard className="text-violet-200">{t("errorNotebookEmpty")}</GlassCard>}
      {groups.map(([type, list]) => {
        const g = grammar.find((x) => x.error_types.includes(type));
        return (
          <GlassCard key={type} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{type.replace(/_/g, " ")}</h2>
              {g && (
                <Link href={`/learn/grammar/${g.id}`} className="text-sm text-violet-200 underline">
                  {t("grammarCard")} →
                </Link>
              )}
            </div>
            {list.map((r) => (
              <button key={r.id} type="button" onClick={() => speak(r.correction)} className="block w-full rounded-2xl px-2 py-1 text-left hover:bg-white/10">
                <div lang="de">
                  <span className="text-err line-through">{r.example}</span> → <span className="text-ok">{r.correction}</span>
                  {r.count > 1 && <span className="ml-2 text-xs text-violet-300">×{r.count}</span>}
                </div>
                <div className="text-sm text-violet-300">{settings.lang === "ru" ? r.rule_ru : r.rule_uk}</div>
              </button>
            ))}
          </GlassCard>
        );
      })}
    </div>
  );
}
