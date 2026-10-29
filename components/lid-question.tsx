"use client";

import { useState } from "react";
import type { LidQuestion } from "@/lib/lid";
import type { Lang } from "@/lib/i18n";

/**
 * Вопрос LiD по-немецки (как на экзамене) + перевод по кнопке.
 * picked === null — ещё не отвечено; reveal — подсветить верный/неверный.
 */
export function LidQuestionView({
  q,
  lang,
  picked,
  reveal,
  onPick,
  translationLabel,
}: {
  q: LidQuestion;
  lang: Lang;
  picked: number | null;
  reveal: boolean;
  onPick: (i: number) => void;
  translationLabel: string;
}) {
  const [showTr, setShowTr] = useState(false);
  const qTr = lang === "ru" ? q.question_ru : q.question_uk;
  const aTr = lang === "ru" ? q.answers_ru : q.answers_uk;
  const answerImages = q.image_url?.includes("{n}");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p lang="de" className="text-lg font-medium leading-snug">
            {q.question}
          </p>
          {qTr && (
            <button
              type="button"
              onClick={() => setShowTr((s) => !s)}
              aria-pressed={showTr}
              className="glass shrink-0 rounded-xl px-2.5 py-1 text-xs"
            >
              {translationLabel}
            </button>
          )}
        </div>
        {showTr && qTr && <p className="text-sm text-violet-200">{qTr}</p>}
        {q.image_url && !answerImages && (
          // eslint-disable-next-line @next/next/no-img-element -- статичные картинки каталога, оптимизация не нужна
          <img src={q.image_url} alt="" className="max-h-56 w-full rounded-2xl bg-white object-contain p-2" />
        )}
      </div>

      <div className={answerImages ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
        {q.answers.map((a, i) => {
          const isRight = reveal && i === q.correct;
          const isWrong = reveal && picked === i && i !== q.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => onPick(i)}
              aria-pressed={picked === i}
              className={`glass rounded-2xl px-4 py-3 text-left transition ${
                isRight ? "!border-ok !bg-ok/25" : isWrong ? "!border-err !bg-err/25" : picked === i ? "!border-violet-300 !bg-white/20" : "hover:bg-white/15"
              }`}
            >
              {answerImages ? (
                // eslint-disable-next-line @next/next/no-img-element -- статичные картинки каталога
                <img src={q.image_url!.replace("{n}", String(i + 1))} alt={`Bild ${i + 1}`} className="mx-auto h-28 w-full rounded-xl bg-white object-contain p-1" />
              ) : (
                <>
                  <span lang="de">{a}</span>
                  {showTr && aTr?.[i] && <span className="mt-0.5 block text-xs text-violet-300">{aTr[i]}</span>}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
