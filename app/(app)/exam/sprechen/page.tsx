"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard } from "@/components/ui";
import { RecordButton } from "@/components/record-button";
import { EvaluationView } from "@/components/evaluation-view";
import { Redemittel, type RedemittelGroup } from "@/components/redemittel";
import { aiErrorKey, aiJson, chatStream, transcribe } from "@/lib/ai/client";
import type { ExtractedError, SpeakingEvaluation } from "@/lib/ai/schemas";
import { loadTasks, saveAttempt, saveErrors, totalScore, type ExamTask } from "@/lib/exam";
import { completeBlock } from "@/lib/cards";
import { speak } from "@/lib/audio";
import type { Key } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };
const TEIL_KEYS: Key[] = ["teil1", "teil2", "teil3"];

function Sprechen() {
  const plan = useSearchParams().get("plan") === "1";
  const { t, settings, profile } = useApp();
  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [teil, setTeil] = useState(1);
  const [task, setTask] = useState<ExamTask | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState<"" | "ai" | "stt" | "eval">("");
  const [hint, setHint] = useState("");
  const [result, setResult] = useState<SpeakingEvaluation | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTasks("sprechen").then(setTasks).catch((e: Error) => setError(e.message));
  }, []);

  const pool = tasks.filter((x) => x.teil === teil);
  const lang = settings.lang;
  const level = profile?.level === "A1" ? "A2" : (profile?.level ?? "A2");
  const body = (messages: Msg[], extra: object = {}) => ({
    model: settings.groqModel,
    level,
    part: teil,
    task: `${task!.instructions.de} ${task!.text ?? ""} Punkte: ${((task!.meta.points as string[]) ?? []).join(", ")}`,
    messages,
    ...extra,
  });

  function pick(n: number) {
    setTeil(n);
    const p = tasks.filter((x) => x.teil === n);
    setTask(p[Math.floor(Math.random() * p.length)] ?? null);
    setMsgs([]);
    setResult(null);
    setHint("");
    setSaved(false);
    setError("");
  }

  async function ask(history: Msg[]) {
    setBusy("ai");
    try {
      const reply = await chatStream(body(history), settings.groqKey, setLive);
      setLive("");
      setMsgs([...history, { role: "assistant", content: reply }]);
      speak(reply, 0.95);
    } catch (e) {
      setError(t(aiErrorKey(e)));
    } finally {
      setBusy("");
    }
  }

  async function onRecorded(blob: Blob) {
    setBusy("stt");
    setError("");
    setHint("");
    try {
      const text = await transcribe(blob, settings.groqKey);
      if (!text) return setBusy("");
      await ask([...msgs, { role: "user", content: text }]);
    } catch (e) {
      setError(t(aiErrorKey(e)));
      setBusy("");
    }
  }

  async function getHint() {
    setBusy("ai");
    try {
      setHint(await chatStream(body(msgs, { hint: lang }), settings.groqKey, setHint));
    } catch (e) {
      setError(t(aiErrorKey(e)));
    } finally {
      setBusy("");
    }
  }

  async function evaluate() {
    const said = msgs.filter((m) => m.role === "user").map((m) => m.content);
    if (said.length === 0) return setError(t("speakMore"));
    setBusy("eval");
    setError("");
    try {
      const transcript = msgs.map((m) => `${m.role === "user" ? "Kandidat" : "Prüfer"}: ${m.content}`).join("\n");
      const ev = await aiJson<SpeakingEvaluation>("/api/ai/evaluate-speaking", settings.groqKey, {
        model: settings.groqModel,
        level,
        part: teil,
        task: body([]).task,
        transcript,
      });
      setResult(ev);
      const attemptId = await saveAttempt({
        kind: "speaking",
        exam_task_id: task!.id,
        part: `sprechen-${teil}`,
        prompt: task!.instructions,
        transcript,
        scores: { ...ev.scores, total: totalScore(ev) },
        level_estimate: ev.level_estimate,
        feedback: ev,
      });
      if (plan) completeBlock("speak");
      const { errors } = await aiJson<{ errors: ExtractedError[] }>("/api/ai/extract-errors", settings.groqKey, {
        model: settings.groqModel,
        text: said.join("\n"),
        corrections: ev.corrections,
      });
      await saveErrors(errors, attemptId);
      setSaved(errors.length > 0);
    } catch (e) {
      setError(e instanceof Error && !("code" in e) ? e.message : t(aiErrorKey(e)));
    } finally {
      setBusy("");
    }
  }

  const groups: RedemittelGroup[] = [`sprechen${teil}` as RedemittelGroup];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("sprechen")}</h1>

      <div className="grid grid-cols-3 gap-2">
        {TEIL_KEYS.map((k, i) => (
          <GlassButton key={k} onClick={() => pick(i + 1)} className={`px-2 py-2 text-sm ${task && teil === i + 1 ? "!bg-white/25" : ""}`}>
            {t("teil")} {i + 1}
            <span className="block text-[11px] text-violet-200">{t(k)}</span>
          </GlassButton>
        ))}
      </div>

      {!settings.groqKey && (
        <GlassCard className="text-center">
          <Link href="/profile" className="text-violet-200 underline">{t("needKey")}</Link>
        </GlassCard>
      )}

      {task && (
        <>
          <GlassCard className="space-y-2">
            <div className="text-3xl">{String(task.meta.emoji ?? "")}</div>
            <p lang="de" className="font-medium">{task.instructions.de}</p>
            <p className="text-sm text-violet-200">{task.instructions[lang]}</p>
            {task.teil === 2 && task.text && <p lang="de" className="text-sm italic text-violet-100">{task.text}</p>}
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {((task.meta.points as string[]) ?? []).map((p) => (
                <li key={p} lang="de" className="glass rounded-xl px-2 py-0.5 text-xs">{p}</li>
              ))}
            </ul>
            {pool.length > 1 && (
              <button type="button" className="text-sm text-violet-300 underline" onClick={() => pick(teil)}>
                {t("otherTask")}
              </button>
            )}
          </GlassCard>

          {!result && (
            <>
              <div className="space-y-2">
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    lang="de"
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === "user" ? "ml-auto bg-violet-500/40" : "glass"}`}
                    onClick={() => m.role === "assistant" && speak(m.content)}
                  >
                    {m.content}
                  </div>
                ))}
                {live && <div lang="de" className="glass max-w-[85%] rounded-2xl px-4 py-2">{live}</div>}
              </div>

              {msgs.length === 0 ? (
                <GlassButton variant="primary" className="w-full" disabled={!settings.groqKey || busy !== ""} onClick={() => ask([])}>
                  {busy === "ai" ? t("examinerThinking") : t("start")}
                </GlassButton>
              ) : (
                <>
                  <RecordButton
                    onRecorded={onRecorded}
                    disabled={busy !== ""}
                    label={{ start: busy === "stt" ? t("recognizing") : busy === "ai" ? t("examinerThinking") : t("recStart"), stop: t("recStop"), denied: t("micDenied") }}
                  />
                  {hint && <GlassCard className="whitespace-pre-line text-sm">{hint}</GlassCard>}
                  <div className="grid grid-cols-2 gap-2">
                    <GlassButton onClick={getHint} disabled={busy !== ""}>💡 {t("hint")}</GlassButton>
                    <GlassButton variant="primary" onClick={evaluate} disabled={busy !== ""}>
                      {busy === "eval" ? t("evaluating") : t("evaluate")}
                    </GlassButton>
                  </div>
                </>
              )}
            </>
          )}

          {result && (
            <>
              <EvaluationView ev={result} original={msgs.filter((m) => m.role === "user").map((m) => m.content).join(" ")} lang={lang} />
              {saved && <p className="text-center text-sm text-ok">{t("errorsSaved")}</p>}
              <GlassButton variant="primary" className="w-full" onClick={() => pick(teil)}>{t("otherTask")}</GlassButton>
            </>
          )}

          <Redemittel groups={groups} lang={lang} title={t("redemittel")} />
        </>
      )}

      {error && <p className="text-center text-sm text-err">{error}</p>}
    </div>
  );
}

export default function SprechenPage() {
  return (
    <Suspense>
      <Sprechen />
    </Suspense>
  );
}
