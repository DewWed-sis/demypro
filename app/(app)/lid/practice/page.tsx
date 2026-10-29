"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { LidQuestionView } from "@/components/lid-question";
import { GlassButton, GlassCard } from "@/components/ui";
import { LID_TOPICS, mistakesQueue, practiceQueue, recordAnswer, type LidQuestion, type LidTopic } from "@/lib/lid";
import { completeBlock } from "@/lib/cards";

function Practice() {
  const params = useSearchParams();
  const mistakes = params.get("mode") === "mistakes";
  const topicParam = params.get("topic") as LidTopic | null;
  const topic = topicParam && LID_TOPICS.includes(topicParam) ? topicParam : undefined;
  const fromPlan = params.get("plan") === "1";
  const { t, settings } = useApp();

  const [queue, setQueue] = useState<LidQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    (mistakes ? mistakesQueue() : practiceQueue(topic)).then(setQueue).catch((e: Error) => setError(e.message));
  }, [mistakes, topic]);

  const q = queue?.[i];

  function pick(n: number) {
    if (!q || picked !== null) return;
    setPicked(n);
    const ok = n === q.correct;
    if (ok) setRight((r) => r + 1);
    recordAnswer(q, ok).catch((e: Error) => setError(e.message));
  }

  function next() {
    setPicked(null);
    setI((x) => x + 1);
    // Блок LiD в плане дня засчитывается после 10 вопросов
    if (fromPlan && i + 1 === 10) completeBlock("lid");
  }

  if (error) return <GlassCard className="text-err">{t("error")}: {error}</GlassCard>;
  if (!queue) return <p className="text-violet-200">{t("loading")}</p>;
  if (!q) {
    return (
      <GlassCard className="space-y-4 text-center">
        <p className="text-lg">{queue.length ? `${right} / ${i}` : t("noMistakes")}</p>
        <Link href="/lid">
          <GlassButton variant="primary">{t("lidTitle")}</GlassButton>
        </Link>
      </GlassCard>
    );
  }

  const explanation = settings.lang === "ru" ? q.explanation_ru : q.explanation_uk;

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-violet-200">
        <span>
          {mistakes ? t("mistakesOnly") : topic ? t(`topic_${topic}`) : t("allQuestions")} · №{q.id}
        </span>
        <span>
          <span className="text-ok">{right}</span> / {i + (picked !== null ? 1 : 0)} · {queue.length}
        </span>
      </div>

      <GlassCard>
        <LidQuestionView key={q.id} q={q} lang={settings.lang} picked={picked} reveal={picked !== null} onPick={pick} translationLabel={t("showTranslation")} />
      </GlassCard>

      {picked !== null && (
        <GlassCard className="space-y-3" role="status">
          <p className={picked === q.correct ? "font-medium text-ok" : "font-medium text-err"}>
            {picked === q.correct ? t("right") : t("wrong")}
          </p>
          {explanation && <p className="text-sm text-violet-100">{explanation}</p>}
          <GlassButton variant="primary" className="w-full" onClick={next}>
            {t("next")}
          </GlassButton>
        </GlassCard>
      )}
    </div>
  );
}

export default function LidPracticePage() {
  return (
    <Suspense>
      <Practice />
    </Suspense>
  );
}
