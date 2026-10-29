"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard } from "@/components/ui";
import { RecordButton } from "@/components/record-button";
import { DiffView } from "@/components/diff-view";
import { DeText } from "@/components/flashcard";
import { aiErrorText, transcribe } from "@/lib/ai/client";
import { completeBlock, shadowingItems, type Item } from "@/lib/cards";
import { wordDiff } from "@/lib/diff";
import { play, speak } from "@/lib/audio";

const PLAN_GOAL = 6; // фраз для зачёта блока «говорение»

function Shadowing() {
  const plan = useSearchParams().get("plan") === "1";
  const { t, settings } = useApp();
  const [items, setItems] = useState<Item[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(0);

  useEffect(() => {
    shadowingItems(12).then(setItems).catch((e: Error) => setError(e.message));
  }, []);

  const item = items?.[idx];

  async function onRecorded(blob: Blob) {
    setBusy(true);
    setError("");
    try {
      setHeard(await transcribe(blob, settings.groqKey));
      const n = tried + 1;
      setTried(n);
      if (plan && n === PLAN_GOAL) completeBlock("speak");
    } catch (e) {
      setError(aiErrorText(e, t));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setHeard(null);
    setError("");
    setIdx((i) => i + 1);
  }

  if (!items) return <p className="text-violet-200">{error || t("loading")}</p>;
  if (!item)
    return (
      <GlassCard className="space-y-4 text-center">
        <p className="text-lg">{t("sessionDone")}</p>
        <Link href="/" className="inline-block">
          <GlassButton variant="primary">{t("backToday")}</GlassButton>
        </Link>
      </GlassCard>
    );

  const diff = heard !== null ? wordDiff(item.de, heard) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("shadowing")}</h1>
        <span className="text-sm text-violet-200">
          {idx + 1} / {items.length}
        </span>
      </div>
      <p className="text-sm text-violet-200">{t("shadowingHint")}</p>

      <GlassCard className="space-y-3 text-center">
        <div className="text-2xl font-semibold">
          <DeText item={item} />
        </div>
        <div className="text-violet-200">{item[settings.lang]}</div>
        <div className="flex justify-center gap-2">
          <GlassButton onClick={() => play(item)}>🔊 {t("listen")}</GlassButton>
          <GlassButton onClick={() => speak(item.de, 0.7)}>🐢 {t("slower")}</GlassButton>
        </div>
      </GlassCard>

      {!settings.groqKey ? (
        <GlassCard className="text-center">
          <Link href="/profile" className="text-violet-200 underline">
            {t("needKey")}
          </Link>
        </GlassCard>
      ) : (
        <RecordButton
          onRecorded={onRecorded}
          disabled={busy}
          maxSec={20}
          label={{ start: busy ? t("recognizing") : t("recStart"), stop: t("recStop"), denied: t("micDenied") }}
        />
      )}

      {error && <p className="text-center text-sm text-err">{error}</p>}

      {diff && (
        <GlassCard className="space-y-2">
          <div className="flex justify-between text-sm text-violet-200">
            <span>{t("youSaid")}</span>
            <span className={diff.score >= 0.8 ? "text-ok" : "text-err"}>
              {t("match")}: {Math.round(diff.score * 100)}%
            </span>
          </div>
          <DiffView tokens={diff.tokens} />
          <p lang="de" className="text-sm text-violet-300">
            «{heard}»
          </p>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 gap-2">
        <GlassButton onClick={() => setHeard(null)} disabled={heard === null}>
          {t("tryAgain")}
        </GlassButton>
        <GlassButton variant="primary" onClick={next}>
          {t("next")}
        </GlassButton>
      </div>
    </div>
  );
}

export default function ShadowingPage() {
  return (
    <Suspense>
      <Shadowing />
    </Suspense>
  );
}
