"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Grade } from "ts-fsrs";
import { useApp } from "@/components/app-provider";
import { Flashcard } from "@/components/flashcard";
import { GlassButton, GlassCard } from "@/components/ui";
import { completeBlock, loadDue, loadNew, rate, type QueueEntry } from "@/lib/cards";
import { newCardsFor, nextStreak } from "@/lib/plan";
import { play } from "@/lib/audio";
import { previewIntervals, Rating } from "@/lib/srs";
import type { Key } from "@/lib/i18n";

const grades: { r: Grade; key: Key; cls: string }[] = [
  { r: Rating.Again, key: "again", cls: "text-err" },
  { r: Rating.Hard, key: "hard", cls: "text-violet-200" },
  { r: Rating.Good, key: "good", cls: "text-ok" },
  { r: Rating.Easy, key: "easy", cls: "text-fuchsia-300" },
];

function CardsSession() {
  const params = useSearchParams();
  const mode = params.get("mode") === "new" ? "new" : "review";
  const lesson = params.get("lesson") ?? undefined;
  const minutes = Number(params.get("min")) || 10;
  const { t, settings, profile, updateProfile } = useApp();

  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    (mode === "new" ? loadNew(newCardsFor(minutes), lesson) : loadDue())
      .then(setQueue)
      .catch((e: Error) => setError(e.message));
  }, [mode, lesson, minutes]);

  const current = queue?.[0];
  const finished = queue !== null && queue.length === 0;

  useEffect(() => {
    if (finished && done > 0 && !lesson) completeBlock(mode);
  }, [finished, done, mode, lesson]);

  function flip() {
    if (!current) return;
    setFlipped(true);
    play(current.item);
  }

  async function grade(r: Grade) {
    if (!current) return;
    setFlipped(false);
    // Again: карта возвращается в конец очереди этой же сессии.
    setQueue((q) => (q ? [...q.slice(1), ...(r === Rating.Again ? [current] : [])] : q));
    setDone((n) => n + 1);
    try {
      const saved = await rate(current, r);
      if (r === Rating.Again) setQueue((q) => q && q.map((e) => (e.item.id === saved.item.id ? saved : e)));
      if (profile && done === 0) {
        const next = nextStreak(profile.streak, profile.last_active_date);
        if (next.last_active_date !== profile.last_active_date) updateProfile(next);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <GlassCard className="text-err">{t("error")}: {error}</GlassCard>;
  if (!queue) return <p className="text-violet-200">{t("loading")}</p>;

  if (finished) {
    return (
      <GlassCard className="space-y-4 text-center">
        <p className="text-lg">{done > 0 ? t("sessionDone") : mode === "new" ? t("noContent") : t("nothingDue")}</p>
        <Link href="/" className="inline-block">
          <GlassButton variant="primary">{t("backToday")}</GlassButton>
        </Link>
      </GlassCard>
    );
  }

  const intervals = current ? previewIntervals(current.fsrs) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-violet-200">
        <span>{mode === "new" ? t("newCards") : t("review")}</span>
        <span>
          {done} / {done + queue.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.item.id + done}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          >
            <Flashcard item={current.item} lang={settings.lang} flipped={flipped} onFlip={flip} prompt={t("sayIt")} />
          </motion.div>
        )}
      </AnimatePresence>

      {flipped && intervals ? (
        <div className="grid grid-cols-4 gap-2">
          {grades.map((g) => (
            <GlassButton key={g.r} onClick={() => grade(g.r)} className="flex flex-col items-center px-1 py-2.5 text-sm">
              <span className={g.cls}>{t(g.key)}</span>
              <span className="text-[11px] text-violet-300">{intervals[g.r]}</span>
            </GlassButton>
          ))}
        </div>
      ) : (
        <GlassButton variant="primary" className="w-full" onClick={flip}>
          {t("showAnswer")}
        </GlassButton>
      )}
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense>
      <CardsSession />
    </Suspense>
  );
}
