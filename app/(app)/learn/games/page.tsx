"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/components/app-provider";
import { Confetti } from "@/components/confetti";
import { DeText } from "@/components/flashcard";
import { GlassButton, GlassCard } from "@/components/ui";
import { gamePool, rate } from "@/lib/cards";
import { buildLesson, same, shuffle, type GameItem, type Task } from "@/lib/games";
import { nextStreak, ymd } from "@/lib/plan";
import { play, speak } from "@/lib/audio";
import { newCard, Rating } from "@/lib/srs";
import type { Key } from "@/lib/i18n";

type Lang = "ru" | "uk";
const XP_KEY = () => `xp:${ymd()}`;
const readXp = () => {
  try {
    return Number(localStorage.getItem(XP_KEY())) || 0;
  } catch {
    return 0;
  }
};

const opt = "glass w-full rounded-2xl px-4 py-3 text-left transition hover:bg-white/15 disabled:pointer-events-none";
const state = (on: boolean, ok: boolean | null) => (on ? (ok ? " !bg-ok/25 ring-2 ring-ok" : " !bg-err/25 ring-2 ring-err") : "");

/** Варианты ответа: выбор сразу проверяется. */
function Options<T>({ list, label, isRight, onAnswer, de }: { list: T[]; label: (o: T) => React.ReactNode; isRight: (o: T) => boolean; onAnswer: (ok: boolean) => void; de?: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="grid gap-2">
      {list.map((o, i) => (
        <button
          key={i}
          lang={de ? "de" : undefined}
          disabled={picked !== null}
          onClick={() => {
            setPicked(i);
            onAnswer(isRight(o));
          }}
          className={opt + (picked !== null && isRight(o) ? state(true, true) : state(picked === i, false))}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

function Build({ task, label, onAnswer }: { task: Extract<Task, { kind: "build" }>; label: string; onAnswer: (ok: boolean) => void }) {
  const [line, setLine] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const toggle = (i: number) => checked === null && setLine((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));
  return (
    <div className="space-y-4">
      <div lang="de" className={"flex min-h-14 flex-wrap gap-2 rounded-2xl border-b-2 border-white/20 p-2" + state(checked !== null, checked)}>
        {line.map((i) => (
          <button key={i} onClick={() => toggle(i)} className="glass rounded-xl px-3 py-2 text-lg">{task.tiles[i]}</button>
        ))}
      </div>
      <div lang="de" className="flex flex-wrap justify-center gap-2">
        {task.tiles.map((w, i) => (
          <button key={i} onClick={() => toggle(i)} className={`glass rounded-xl px-3 py-2 text-lg ${line.includes(i) ? "opacity-20" : ""}`}>{w}</button>
        ))}
      </div>
      {checked === null && (
        <GlassButton
          variant="primary"
          className="w-full"
          disabled={!line.length}
          onClick={() => {
            const ok = same(line.map((i) => task.tiles[i]).join(" "), task.item.de);
            setChecked(ok);
            onAnswer(ok);
          }}
        >
          {label}
        </GlassButton>
      )}
    </div>
  );
}

function Pairs({ items, lang, onAnswer }: { items: GameItem[]; lang: Lang; onAnswer: (ok: boolean) => void }) {
  const [right] = useState(() => shuffle(items));
  const [left] = useState(() => shuffle(items));
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const [errors, setErrors] = useState(0);
  function pickRight(id: string) {
    if (!sel) return;
    if (sel === id) {
      const next = [...done, id];
      setDone(next);
      play(items.find((i) => i.id === id)!);
      if (next.length === items.length) onAnswer(errors <= 1);
    } else {
      setMiss(id);
      setErrors((e) => e + 1);
      setTimeout(() => setMiss(null), 500);
    }
    setSel(null);
  }
  const cell = (id: string) => `${opt} text-center ${done.includes(id) ? "opacity-30" : ""}`;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="grid gap-2">
        {left.map((i) => (
          <button key={i.id} lang="de" disabled={done.includes(i.id)} onClick={() => setSel(i.id)} className={cell(i.id) + (sel === i.id ? " ring-2 ring-violet-300" : "")}>{i.de}</button>
        ))}
      </div>
      <div className="grid gap-2">
        {right.map((i) => (
          <button key={i.id} disabled={done.includes(i.id)} onClick={() => pickRight(i.id)} className={cell(i.id) + state(miss === i.id, false)}>{i[lang]}</button>
        ))}
      </div>
    </div>
  );
}

const ARTICLES = [
  { a: "der", cls: "text-der" },
  { a: "die", cls: "text-die" },
  { a: "das", cls: "text-das" },
] as const;

function TaskView({ task, lang, t, onAnswer }: { task: Task; lang: Lang; t: (k: Key) => string; onAnswer: (ok: boolean) => void }) {
  const big = "text-2xl font-semibold";
  switch (task.kind) {
    case "choose":
      return (
        <>
          <p className="text-violet-200">{t("gameChoose")}</p>
          <p className={big} lang={task.toDe ? undefined : "de"}>{task.toDe ? task.item[lang] : <DeText item={task.item} />}</p>
          <Options list={task.options} de={task.toDe} label={(o) => (task.toDe ? o.de : o[lang])} isRight={(o) => o.id === task.item.id} onAnswer={onAnswer} />
        </>
      );
    case "listen":
      return (
        <>
          <p className="text-violet-200">{t("gameListen")}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => play(task.item)} className="glass grid size-20 place-items-center rounded-full text-3xl" aria-label="Play">🔊</button>
            <button onClick={() => speak(task.item.de, 0.6)} className="glass grid size-14 place-items-center self-end rounded-full text-xl" aria-label="Slow">🐢</button>
          </div>
          <Options list={task.options} de label={(o) => o.de} isRight={(o) => o.id === task.item.id} onAnswer={onAnswer} />
        </>
      );
    case "picture":
      return (
        <>
          <p className="text-violet-200">{t("gamePicture")}</p>
          <div className="text-center text-8xl" aria-hidden>{task.item.emoji}</div>
          <Options list={task.options} de label={(o) => <DeText item={o} />} isRight={(o) => o.id === task.item.id} onAnswer={onAnswer} />
        </>
      );
    case "article":
      return (
        <>
          <p className="text-violet-200">{t("gameArticle")}</p>
          <p className={`${big} text-center`} lang="de">{task.item.emoji && <span className="mr-2" aria-hidden>{task.item.emoji}</span>}{task.noun}</p>
          <p className="text-center text-sm text-violet-200">{task.item[lang]}</p>
          <div className="grid grid-cols-3 gap-2">
            <Options list={[...ARTICLES]} de label={(o) => <b className={`text-xl ${o.cls}`}>{o.a}</b>} isRight={(o) => o.a === task.article} onAnswer={onAnswer} />
          </div>
        </>
      );
    case "build":
      return (
        <>
          <p className="text-violet-200">{t("gameBuild")}</p>
          <p className={big}>{task.item[lang]}</p>
          <Build task={task} label={t("check")} onAnswer={onAnswer} />
        </>
      );
    case "cloze":
      return (
        <>
          <p className="text-violet-200">{t("gameCloze")}</p>
          <p className="text-xl" lang="de">{task.item.cloze}</p>
          <p className="text-sm text-violet-200">{task.item[lang]}</p>
          <Options list={task.options} de label={(o) => o} isRight={(o) => same(o, task.answer)} onAnswer={onAnswer} />
        </>
      );
    case "pairs":
      return (
        <>
          <p className="text-violet-200">{t("gamePairs")}</p>
          <Pairs items={task.items} lang={lang} onAnswer={onAnswer} />
        </>
      );
  }
}

export default function GamesPage() {
  const { t, settings, profile, updateProfile } = useApp();
  const [pool, setPool] = useState<GameItem[] | null>(null);
  const [queue, setQueue] = useState<(Task & { retry?: boolean })[]>([]);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ right: 0, wrong: 0, combo: 0, xp: 0 });
  const [dayXp, setDayXp] = useState(0);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);

  const level = profile?.level;
  useEffect(() => {
    if (level)
      gamePool(level)
        .then((p) => {
          setPool(p);
          start(p);
        })
        .catch((e: Error) => setError(e.message));
  }, [level]);

  function start(p: GameItem[]) {
    const tasks = buildLesson(p);
    setQueue(tasks);
    setTotal(tasks.length);
    setStats({ right: 0, wrong: 0, combo: 0, xp: 0 });
    setResult(null);
    setRound((r) => r + 1);
    setDayXp(readXp());
  }

  const task = queue[0];
  const finished = round > 0 && !task;

  function answer(ok: boolean) {
    setResult(ok);
    if (task && "item" in task) play(task.item);
    setStats((s) => ({ right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), combo: ok ? s.combo + 1 : 0, xp: s.xp + (ok ? 10 + Math.min(s.combo, 5) * 2 : 0) }));
    // Ошибка по фразе курса или своему слову → карточка в повторение FSRS.
    if (!ok && task && "item" in task && task.item.src !== "picture") {
      rate({ item: task.item, cardId: null, fsrs: newCard(), type: task.item.src === "word" ? "word" : "content" }, Rating.Again).catch(() => {});
    }
  }

  function next() {
    const rest = queue.slice(1);
    const cur = queue[0];
    setQueue(result === false && !cur.retry ? [...rest, { ...cur, retry: true }] : rest);
    setResult(null);
    if (rest.length || result === false) return;
    // Урок завершён: XP за день и стрик.
    try {
      const xp = readXp() + stats.xp;
      localStorage.setItem(XP_KEY(), String(xp));
      setDayXp(xp);
    } catch {}
    if (profile) {
      const s = nextStreak(profile.streak, profile.last_active_date);
      if (s.last_active_date !== profile.last_active_date) updateProfile(s);
    }
  }

  if (error) return <GlassCard className="text-err">{t("error")}: {error}</GlassCard>;
  if (!pool || !round) return <p className="text-violet-200">{t("loading")}</p>;

  if (finished) {
    const acc = stats.right / Math.max(1, stats.right + stats.wrong);
    return (
      <GlassCard className="space-y-4 text-center">
        {acc >= 0.8 && <Confetti />}
        <div className="text-6xl">{acc >= 0.8 ? "🏆" : "💪"}</div>
        <h1 className="text-2xl font-semibold">{t("gameDone")}</h1>
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-2xl p-3"><div className="text-2xl font-semibold text-fuchsia-300">+{stats.xp}</div><div className="text-xs text-violet-200">XP</div></div>
          <div className="glass rounded-2xl p-3"><div className="text-2xl font-semibold text-ok">{Math.round(acc * 100)}%</div><div className="text-xs text-violet-200">{t("accuracy")}</div></div>
          <div className="glass rounded-2xl p-3"><div className="text-2xl font-semibold">{dayXp}</div><div className="text-xs text-violet-200">{t("xpToday")}</div></div>
        </div>
        {stats.wrong > 0 && <p className="text-sm text-violet-200">{t("gameMistakesToReview")}</p>}
        <GlassButton variant="primary" className="w-full" onClick={() => start(pool)}>{t("gameAgain")}</GlassButton>
        <Link href="/learn" className="block text-sm text-violet-200 underline">{t("learn")}</Link>
      </GlassCard>
    );
  }

  const progress = (total - queue.filter((q) => !q.retry).length) / total;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/learn" aria-label={t("learn")} className="text-xl text-violet-200">✕</Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" animate={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-sm text-fuchsia-300" aria-label="XP">{stats.combo >= 3 ? `🔥${stats.combo}` : `${stats.xp} XP`}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${round}-${queue.length}-${task.kind}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
          <GlassCard className="space-y-4">
            {task.retry && <p className="text-xs text-err">{t("gameRetry")}</p>}
            <TaskView task={task} lang={settings.lang} t={t} onAnswer={answer} />
          </GlassCard>
        </motion.div>
      </AnimatePresence>
      {result !== null && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <GlassCard className={`space-y-3 ${result ? "ring-2 ring-ok" : "ring-2 ring-err"}`}>
            <p className={`font-semibold ${result ? "text-ok" : "text-err"}`}>{result ? t("gameRight") : t("gameWrong")}</p>
            {!result && "item" in task && (
              <p lang="de" className="text-lg"><DeText item={task.item} /> <span className="text-sm text-violet-200">— {task.item[settings.lang]}</span></p>
            )}
            <GlassButton variant="primary" className="w-full" onClick={next}>{t("next")}</GlassButton>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
