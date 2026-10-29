"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { GlassButton, GlassCard } from "./ui";
import { saveAttempt, type ExamTask } from "@/lib/exam";

type Q = { q: string; choices: string[]; answer: number; seg?: number; trap_ru: string; trap_uk: string };
type Line = { s: string; de: string };
const letters = "abcdefghi";
const qs = (task: ExamTask) => task.options as Q[];

/** Аудио сегмента с ограничением прослушиваний (в режиме экзамена). */
function Player({ src, limit, label }: { src: string; limit: number | null; label: string }) {
  const { t } = useApp();
  const [left, setLeft] = useState(limit);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);
  function play() {
    if (left === 0 || playing) return;
    ref.current ??= new Audio(src);
    ref.current.onended = () => setPlaying(false);
    ref.current.currentTime = 0;
    ref.current.play().then(() => setPlaying(true)).catch(() => {});
    if (left !== null) setLeft(left - 1);
  }
  useEffect(() => () => ref.current?.pause(), []);
  return (
    <GlassButton onClick={play} disabled={left === 0 || playing} className="px-3 py-2 text-sm">
      {playing ? "🔊 …" : `▶ ${label}`}
      {left !== null && <span className="ml-2 text-[11px] text-violet-300">{left} {t("plays")}</span>}
    </GlassButton>
  );
}

/** Одна часть DTZ: материалы (аудио/тексты/объявления) + вопросы. training = сразу проверка и разбор ловушки. */
function TeilView({
  task,
  answers,
  setAnswer,
  training,
  reveal,
}: {
  task: ExamTask;
  answers: Record<string, number>;
  setAnswer: (key: string, v: number) => void;
  training: boolean;
  reveal: boolean;
}) {
  const { t, settings } = useApp();
  const segs = (task.meta.segments as Line[][] | undefined) ?? [];
  const texts = (task.meta.texts as string[] | undefined) ?? [];
  const ads = (task.meta.ads as { k: string; t: string }[] | undefined) ?? [];
  const statements = (task.meta.statements as string[] | undefined) ?? [];
  const limit = training ? null : Number(task.meta.plays) || 1;

  return (
    <div className="space-y-3">
      <GlassCard className="space-y-1">
        <div className="text-xs text-violet-300">{task.part === "hoeren" ? "Hören" : "Lesen"} · Teil {task.teil}</div>
        <p lang="de">{task.instructions.de}</p>
        <p className="text-sm text-violet-200">{task.instructions[settings.lang]}</p>
      </GlassCard>

      {task.text && (
        <GlassCard lang="de" className="whitespace-pre-line text-[15px] leading-relaxed">{task.text}</GlassCard>
      )}
      {ads.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ads.map((a) => (
            <GlassCard key={a.k} lang="de" className="p-4 text-sm"><b>{a.k}</b> {a.t}</GlassCard>
          ))}
        </div>
      )}
      {statements.length > 0 && (
        <GlassCard lang="de" className="space-y-1 text-sm">
          {statements.map((s, i) => <div key={i}><b>{letters[i]}</b> {s}</div>)}
        </GlassCard>
      )}

      {qs(task).map((q, qi) => {
        const key = `${task.id}:${qi}`;
        const picked = answers[key];
        const show = reveal || (training && picked !== undefined);
        const prevSeg = qi > 0 ? qs(task)[qi - 1].seg : undefined;
        return (
          <div key={key} className="space-y-2">
            {q.seg !== undefined && q.seg !== prevSeg && segs[q.seg] && (
              <Player src={`/audio/exam/${task.id}-${q.seg}.m4a`} limit={limit} label={`${t("play")} ${q.seg + 1}`} />
            )}
            {q.seg !== undefined && q.seg !== prevSeg && texts[q.seg] && (
              <GlassCard lang="de" className="whitespace-pre-line text-[15px] leading-relaxed">{texts[q.seg]}</GlassCard>
            )}
            <GlassCard className="space-y-2 p-4">
              <p lang="de" className="font-medium">{q.q}</p>
              <div className={q.choices.length > 4 ? "flex flex-wrap gap-2" : "grid gap-2"}>
                {q.choices.map((c, ci) => {
                  const cls = show
                    ? ci === q.answer
                      ? "!border-ok !bg-ok/25"
                      : ci === picked
                        ? "!border-err !bg-err/25"
                        : ""
                    : ci === picked
                      ? "!bg-white/25"
                      : "";
                  return (
                    <button
                      key={ci}
                      type="button"
                      lang="de"
                      disabled={show}
                      onClick={() => setAnswer(key, ci)}
                      className={`glass rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-white/15 ${cls}`}
                    >
                      {q.choices.length > 4 || q.choices[0] === "richtig" ? c : <><b>{letters[ci]}</b> {c}</>}
                    </button>
                  );
                })}
              </div>
              {show && (
                <p className="text-sm text-violet-200">
                  <b>{t("trap")}:</b> {settings.lang === "ru" ? q.trap_ru : q.trap_uk}
                </p>
              )}
            </GlassCard>
            {show && q.seg !== undefined && q.seg !== qs(task)[qi + 1]?.seg && segs[q.seg] && (
              <details className="text-sm text-violet-200">
                <summary className="cursor-pointer">{t("transcript")}</summary>
                <p lang="de" className="mt-1 space-y-1">
                  {segs[q.seg].map((l, i) => <span key={i} className="block">— {l.de}</span>)}
                </p>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

const LIMITS = { hoeren: 25 * 60, lesen: 45 * 60 };

/** Hören/Lesen: тренировка по частям или полный вариант с таймером и итогом. */
export function ExamRunner({
  part,
  tasks,
  fixed,
  onDone,
}: {
  part: "hoeren" | "lesen";
  tasks: ExamTask[];
  fixed?: ExamTask[]; // сразу полный вариант без меню (пробный экзамен)
  onDone?: (correct: number, total: number) => void;
}) {
  const { t } = useApp();
  const [mode, setMode] = useState<null | { training: boolean; list: ExamTask[] }>(fixed ? { training: false, list: fixed } : null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState(LIMITS[part]);
  const finishRef = useRef<() => void>(() => {});

  const sets = [...new Set(tasks.map((x) => String(x.meta.satz)))].sort();
  const total = mode ? mode.list.reduce((s, x) => s + qs(x).length, 0) : 0;
  const correct = mode ? mode.list.reduce((s, x) => s + qs(x).filter((q, i) => answers[`${x.id}:${i}`] === q.answer).length, 0) : 0;

  useEffect(() => {
    finishRef.current = () => {
      if (finished || !mode) return;
      setFinished(true);
      const ratio = total ? correct / total : 0;
      saveAttempt({ kind: part, part, prompt: { tasks: mode.list.map((x) => x.id), training: mode.training }, scores: { correct, total, ratio } }).catch(() => {});
      onDone?.(correct, total);
    };
  });

  useEffect(() => {
    if (!mode || mode.training || finished) return;
    const id = setInterval(() => setLeft((s) => {
      if (s <= 1) finishRef.current();
      return Math.max(0, s - 1);
    }), 1000);
    return () => clearInterval(id);
  }, [mode, finished]);

  function start(training: boolean, list: ExamTask[]) {
    setMode({ training, list });
    setAnswers({});
    setStep(0);
    setFinished(false);
    setLeft(LIMITS[part]);
    scrollTo({ top: 0 });
  }

  if (!mode) {
    return (
      <div className="space-y-3">
        <h2 className="font-medium">{t("fullTest")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {sets.map((s) => (
            <GlassButton key={s} variant="primary" onClick={() => start(false, tasks.filter((x) => x.meta.satz === s).sort((a, b) => a.teil - b.teil))}>
              {t("satz")} {s}
            </GlassButton>
          ))}
        </div>
        <h2 className="pt-2 font-medium">{t("training")}</h2>
        <p className="text-sm text-violet-200">{t("trainingHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          {tasks.map((x) => (
            <GlassButton key={x.id} onClick={() => start(true, [x])} className="text-sm">
              Teil {x.teil} · {String(x.meta.satz)}
            </GlassButton>
          ))}
        </div>
      </div>
    );
  }

  const task = mode.list[step];
  const isLast = step === mode.list.length - 1;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  // Шкала DTZ: Hören+Lesen = 45 заданий; 33+ → B1, 20+ → A2 (g.a.s.t.). Для одной части — пропорционально.
  const ratio = total ? correct / total : 0;
  const level = ratio >= 33 / 45 ? "B1" : ratio >= 20 / 45 ? "A2" : t("belowA2");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-violet-200">
        <button type="button" className="underline" onClick={() => setMode(null)}>← {part === "hoeren" ? "Hören" : "Lesen"}</button>
        <span>{mode.list.length > 1 && `Teil ${step + 1}/${mode.list.length}`}</span>
        {!mode.training && !finished && <span className={left < 300 ? "text-err" : ""}>⏱ {mm}:{ss}</span>}
      </div>

      {finished && (
        <GlassCard className="space-y-1 text-center">
          <div className="text-3xl font-semibold">{correct} / {total}</div>
          <div className="text-violet-200">{t("levelReached")}: <b>{level}</b></div>
        </GlassCard>
      )}

      {(finished ? mode.list : [task]).map((x) => (
        <TeilView
          key={x.id}
          task={x}
          answers={answers}
          setAnswer={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))}
          training={mode.training}
          reveal={finished}
        />
      ))}

      {!finished && (
        <div className="grid grid-cols-2 gap-2">
          <GlassButton disabled={step === 0} onClick={() => { setStep(step - 1); scrollTo({ top: 0 }); }}>←</GlassButton>
          {isLast ? (
            <GlassButton variant="primary" onClick={() => finishRef.current()}>{t("finish")}</GlassButton>
          ) : (
            <GlassButton variant="primary" onClick={() => { setStep(step + 1); scrollTo({ top: 0 }); }}>{t("next")} →</GlassButton>
          )}
        </div>
      )}
      {finished && !fixed && <GlassButton className="w-full" onClick={() => setMode(null)}>{t("backToday")}</GlassButton>}
    </div>
  );
}
