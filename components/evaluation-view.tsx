"use client";

import type { Evaluation } from "@/lib/ai/schemas";
import { wordDiff } from "@/lib/diff";
import type { Lang } from "@/lib/i18n";
import { useApp } from "./app-provider";
import { DiffView } from "./diff-view";
import { GlassCard, ReadinessBar } from "./ui";

/** Разбор AI: баллы по критериям DTZ, оценка уровня, исправленный текст с подсветкой правок, правила. */
export function EvaluationView({ ev, original, lang }: { ev: Evaluation; original: string; lang: Lang }) {
  const { t } = useApp();
  const crit = [
    ["task", t("critTask")],
    ["coherence", t("critCoherence")],
    ["grammar", t("critGrammar")],
    ["vocabulary", t("critVocabulary")],
  ] as const;
  const corrected = ev.corrected_text ? wordDiff(ev.corrected_text, original).tokens : null;
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{t("result")}</h2>
          <span className="glass rounded-2xl px-3 py-1 text-lg font-semibold">{ev.level_estimate}</span>
        </div>
        {crit.map(([k, label]) => (
          <ReadinessBar key={k} label={label} value={ev.scores[k] / 5} />
        ))}
        <p className="text-sm text-violet-200">{lang === "ru" ? ev.summary_ru : ev.summary_uk}</p>
      </GlassCard>

      {ev.points_covered.length > 0 && (
        <GlassCard className="space-y-1">
          <h3 className="text-sm text-violet-200">{t("pointsCovered")}</h3>
          {ev.points_covered.map((p) => (
            <div key={p} lang="de" className="text-ok">✓ {p}</div>
          ))}
        </GlassCard>
      )}

      {corrected && (
        <GlassCard className="space-y-2">
          <h3 className="text-sm text-violet-200">{t("correctedText")}</h3>
          <DiffView tokens={corrected} mode="edit" />
          <p className="text-xs text-violet-300">{t("correctedLegend")}</p>
        </GlassCard>
      )}

      {ev.corrections.length > 0 && (
        <GlassCard className="space-y-3">
          <h3 className="text-sm text-violet-200">{t("corrections")}</h3>
          {ev.corrections.map((c, i) => (
            <div key={i} className="space-y-0.5">
              <div lang="de">
                <span className="text-err line-through">{c.original}</span> → <span className="text-ok">{c.fixed}</span>
              </div>
              <div className="text-sm text-violet-300">{lang === "ru" ? c.rule_ru : c.rule_uk}</div>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
