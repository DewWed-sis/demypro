"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard } from "@/components/ui";
import { EvaluationView } from "@/components/evaluation-view";
import { Redemittel } from "@/components/redemittel";
import { aiErrorKey, aiJson } from "@/lib/ai/client";
import type { Evaluation, ExtractedError } from "@/lib/ai/schemas";
import { loadTasks, saveAttempt, saveErrors, totalScore, type ExamTask } from "@/lib/exam";
import { completeBlock } from "@/lib/cards";
import { supabase } from "@/lib/supabase";

const LIMIT = 30 * 60;
const draftKey = (id: string) => `dtz-draft-${id}`;
const points = (task: ExamTask) => (task.meta.points as string[]) ?? [];

// Каркас письма: обращение, вступление, по строке на пункт, завершение.
function template(task: ExamTask) {
  const formal = task.meta.register === "formell";
  const lines = [
    formal ? "Sehr geehrte Damen und Herren," : "Liebe/Lieber …,",
    "",
    formal ? "ich schreibe Ihnen, weil …" : "vielen Dank für deine Nachricht! …",
    ...points(task).slice(1).map((p) => `[${p}] …`),
    "",
    formal ? "Mit freundlichen Grüßen" : "Viele Grüße",
    "…",
  ];
  return lines.join("\n");
}

type Past = { id: string; created_at: string; level_estimate: string; scores: { total?: number }; prompt: { de?: string } | null };

function Schreiben() {
  const plan = useSearchParams().get("plan") === "1";
  const { t, settings, profile } = useApp();
  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [pair, setPair] = useState(1);
  const [task, setTask] = useState<ExamTask | null>(null);
  const [text, setText] = useState("");
  const [left, setLeft] = useState(LIMIT);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Past[]>([]);

  useEffect(() => {
    loadTasks("schreiben")
      .then((all) => {
        setTasks(all);
        setPair(1 + Math.floor(Math.random() * Math.max(1, ...all.map((x) => Number(x.meta.pair) || 1))));
      })
      .catch((e: Error) => setError(e.message));
    supabase
      .from("attempts")
      .select("id, created_at, level_estimate, scores, prompt")
      .eq("kind", "writing")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data as Past[]) ?? []));
  }, []);

  useEffect(() => {
    if (!task || result) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [task, result]);

  function choose(x: ExamTask) {
    setTask(x);
    setResult(null);
    setSaved(false);
    setLeft(LIMIT);
    try {
      setText(localStorage.getItem(draftKey(x.id)) ?? "");
    } catch {
      setText("");
    }
  }

  function edit(v: string) {
    setText(v);
    try {
      localStorage.setItem(draftKey(task!.id), v);
    } catch {}
  }

  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  const level = profile?.level === "A1" ? "A2" : (profile?.level ?? "B1");

  async function check() {
    if (words < 20) return setError(t("writeMore"));
    setBusy(true);
    setError("");
    try {
      const ev = await aiJson<Evaluation>("/api/ai/evaluate-writing", settings.groqKey, {
        model: settings.groqModel,
        level,
        task: task!.instructions.de,
        points: points(task!),
        text,
      });
      setResult(ev);
      const attemptId = await saveAttempt({
        kind: "writing",
        exam_task_id: task!.id,
        part: "schreiben",
        prompt: task!.instructions,
        text,
        scores: { ...ev.scores, total: totalScore(ev) },
        level_estimate: ev.level_estimate,
        feedback: ev,
      });
      try {
        localStorage.removeItem(draftKey(task!.id));
      } catch {}
      if (plan) completeBlock("write");
      const { errors } = await aiJson<{ errors: ExtractedError[] }>("/api/ai/extract-errors", settings.groqKey, {
        model: settings.groqModel,
        text,
        corrections: ev.corrections,
      });
      await saveErrors(errors, attemptId);
      setSaved(errors.length > 0);
    } catch (e) {
      setError(t(aiErrorKey(e)));
    } finally {
      setBusy(false);
    }
  }

  const pairs = [...new Set(tasks.map((x) => Number(x.meta.pair)))];
  const choices = tasks.filter((x) => Number(x.meta.pair) === pair);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("schreiben")}</h1>

      {!task && (
        <>
          <p className="text-sm text-violet-200">{t("chooseTopic")}</p>
          {choices.map((x) => (
            <button key={x.id} type="button" onClick={() => choose(x)} className="glass block w-full rounded-3xl p-5 text-left transition hover:bg-white/15">
              <span className="text-xs text-violet-300">{t(x.meta.register === "formell" ? "formell" : "informell")}</span>
              <span lang="de" className="mt-1 block">{x.instructions.de}</span>
              <span className="mt-1 block text-sm text-violet-200">{x.instructions[settings.lang]}</span>
            </button>
          ))}
          {pairs.length > 1 && (
            <GlassButton className="w-full" onClick={() => setPair((p) => (pairs.indexOf(p) + 1) % pairs.length + 1)}>
              {t("otherPair")}
            </GlassButton>
          )}
        </>
      )}

      {task && (
        <>
          <GlassCard className="space-y-2">
            <div className="flex justify-between text-xs text-violet-300">
              <span>{t(task.meta.register === "formell" ? "formell" : "informell")}</span>
              {!result && <span className={left < 300 ? "text-err" : ""}>⏱ {mm}:{ss}</span>}
            </div>
            <p lang="de">{task.instructions.de}</p>
            <p className="text-sm text-violet-200">{task.instructions[settings.lang]}</p>
            <ol className="list-decimal space-y-0.5 pl-5" lang="de">
              {points(task).map((p) => <li key={p}>{p}</li>)}
            </ol>
            {!result && <p className="text-xs text-violet-300">{t("writeAllPoints")}</p>}
          </GlassCard>

          {!result && (
            <>
              <textarea
                lang="de"
                value={text}
                onChange={(e) => edit(e.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full rounded-3xl border border-white/20 bg-white/10 p-4 text-violet-50 outline-none focus:border-violet-300"
                aria-label={t("schreiben")}
              />
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => edit(template(task) + (text ? `\n\n${text}` : ""))} className="text-violet-200 underline">
                  {t("insertTemplate")}
                </button>
                <span className={words >= 70 ? "text-ok" : "text-violet-200"}>{words} {t("words")}</span>
              </div>
              {settings.groqKey ? (
                <GlassButton variant="primary" className="w-full" disabled={busy} onClick={check}>
                  {busy ? t("evaluating") : t("check")}
                </GlassButton>
              ) : (
                <GlassCard className="text-center">
                  <Link href="/profile" className="text-violet-200 underline">{t("needKey")}</Link>
                </GlassCard>
              )}
            </>
          )}

          {result && (
            <>
              <EvaluationView ev={result} original={text} lang={settings.lang} />
              {saved && <p className="text-center text-sm text-ok">{t("errorsSaved")}</p>}
              <GlassButton variant="primary" className="w-full" onClick={() => setTask(null)}>{t("newLetter")}</GlassButton>
            </>
          )}

          <Redemittel groups={task.meta.register === "formell" ? ["formell", "b1"] : ["informell", "b1"]} lang={settings.lang} title={t("redemittel")} />
        </>
      )}

      {error && <p className="text-center text-sm text-err">{error}</p>}

      {!task && history.length > 0 && (
        <GlassCard className="space-y-2">
          <h2 className="font-medium">{t("history")}</h2>
          {history.map((h) => (
            <div key={h.id} className="flex justify-between gap-2 text-sm">
              <span lang="de" className="truncate">{h.prompt?.de}</span>
              <span className="shrink-0 text-violet-200">
                {h.level_estimate} · {Math.round((h.scores.total ?? 0) * 100)}%
              </span>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}

export default function SchreibenPage() {
  return (
    <Suspense>
      <Schreiben />
    </Suspense>
  );
}
