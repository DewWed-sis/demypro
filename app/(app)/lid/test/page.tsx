"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { LidQuestionView } from "@/components/lid-question";
import { GlassButton, GlassCard } from "@/components/ui";
import { mockTestSet, recordAnswer, saveMockTest, type LidQuestion } from "@/lib/lid";

const LIMIT_SEC = 60 * 60;

export default function LidTestPage() {
  const { t, settings } = useApp();
  const [qs, setQs] = useState<LidQuestion[] | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [i, setI] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false);
  const finishRef = useRef(() => {});

  useEffect(() => {
    if (!startedAt || finished) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n - startedAt >= LIMIT_SEC * 1000) finishRef.current(); // время вышло — завершаем сами
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, finished]);

  const left = startedAt ? Math.max(0, LIMIT_SEC - Math.floor((now - startedAt) / 1000)) : LIMIT_SEC;

  async function start() {
    const set = await mockTestSet();
    setQs(set);
    setAnswers(set.map(() => null));
    setI(0);
    setFinished(false);
    setStartedAt(Date.now());
    setNow(Date.now());
  }

  async function finish() {
    if (!qs || finished) return;
    setFinished(true);
    const correct = qs.filter((q, k) => answers[k] === q.correct).length;
    await saveMockTest(correct, qs.length);
    // Ошибки теста попадают в «Только ошибки» и в FSRS
    await Promise.all(qs.map((q, k) => (answers[k] === null ? null : recordAnswer(q, answers[k] === q.correct))));
  }


  useEffect(() => {
    finishRef.current = finish;
  });

  if (!qs || !startedAt) {
    return (
      <GlassCard className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">{t("mockTest")}</h1>
        <p className="text-sm text-violet-200">30 + 3 NRW · 60:00</p>
        <GlassButton variant="primary" className="w-full" onClick={start}>
          {t("start")}
        </GlassButton>
      </GlassCard>
    );
  }

  if (finished) {
    const correct = qs.filter((q, k) => answers[k] === q.correct).length;
    const wrong = qs.map((q, k) => ({ q, a: answers[k] })).filter(({ q, a }) => a !== q.correct);
    return (
      <div className="space-y-4">
        <GlassCard className="space-y-3 text-center">
          <h1 className="text-sm text-violet-200">{t("result")}</h1>
          <p className="text-5xl font-semibold">
            {correct}
            <span className="text-2xl text-violet-300"> / {qs.length}</span>
          </p>
          <p className={correct >= 15 ? "text-ok" : "text-err"}>
            {t("passCourse")}: {correct >= 15 ? t("passed") : t("notPassed")}
          </p>
          <p className={correct >= 17 ? "text-ok" : "text-err"}>
            {t("passNat")}: {correct >= 17 ? t("passed") : t("notPassed")}
          </p>
        </GlassCard>
        {wrong.length > 0 && (
          <GlassCard className="space-y-3">
            <h2 className="font-medium">{t("yourMistakes")}</h2>
            {wrong.map(({ q, a }) => (
              <div key={q.id} className="space-y-1 border-t border-white/10 pt-3 text-sm">
                <p lang="de">
                  №{q.id}. {q.question}
                </p>
                {a !== null && (
                  <p className="text-err">
                    {t("yourAnswer")}: <span lang="de">{q.answers[a]}</span>
                  </p>
                )}
                <p className="text-ok">
                  {t("correctAnswer")}: <span lang="de">{q.answers[q.correct]}</span>
                </p>
              </div>
            ))}
          </GlassCard>
        )}
        <div className="grid grid-cols-2 gap-2">
          <GlassButton onClick={start}>{t("start")}</GlassButton>
          <Link href="/lid">
            <GlassButton className="w-full">{t("lidTitle")}</GlassButton>
          </Link>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const answered = answers.filter((a) => a !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-violet-200">
          {i + 1} / {qs.length}
        </span>
        <span className={`glass rounded-xl px-3 py-1 tabular-nums ${left < 300 ? "text-err" : ""}`} aria-label={t("timeLeft")}>
          ⏱ {mm}:{ss}
        </span>
      </div>

      <GlassCard>
        <LidQuestionView
          key={q.id}
          q={q}
          lang={settings.lang}
          picked={answers[i]}
          reveal={false}
          onPick={(n) => setAnswers((a) => a.map((x, k) => (k === i ? n : x)))}
          translationLabel={t("showTranslation")}
        />
      </GlassCard>

      <div className="flex flex-wrap gap-1" aria-label="Fragen">
        {qs.map((_, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setI(k)}
            aria-current={k === i}
            className={`size-7 rounded-lg text-xs ${k === i ? "bg-violet-400 text-white" : answers[k] !== null ? "bg-white/25" : "bg-white/10"}`}
          >
            {k + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <GlassButton onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          ←
        </GlassButton>
        {i < qs.length - 1 ? (
          <GlassButton variant="primary" onClick={() => setI((x) => x + 1)}>
            {t("next")} →
          </GlassButton>
        ) : (
          <GlassButton variant="primary" onClick={finish}>
            {t("finish")} ({answered}/{qs.length})
          </GlassButton>
        )}
      </div>
    </div>
  );
}
