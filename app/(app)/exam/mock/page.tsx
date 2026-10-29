"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { Confetti } from "@/components/confetti";
import { ExamRunner } from "@/components/exam-runner";
import { GlassButton, GlassCard, ReadinessBar } from "@/components/ui";
import { loadTasks, type ExamTask } from "@/lib/exam";
import { dtzLevel } from "@/lib/readiness";
import { supabase } from "@/lib/supabase";

type Step = "intro" | "hoeren" | "lesen" | "summary";
const pickSet = (tasks: ExamTask[]) => {
  const sets = [...new Set(tasks.map((x) => String(x.meta.satz)))];
  const s = sets[Math.floor(Math.random() * sets.length)];
  return tasks.filter((x) => x.meta.satz === s).sort((a, b) => a.teil - b.teil);
};
const WEEK = 7 * 86_400_000;

/** Пробный DTZ раз в неделю: Hören → Lesen подряд, затем учёт последних Schreiben/Sprechen и итог по шкале g.a.s.t. */
export default function MockPage() {
  const { t } = useApp();
  const [step, setStep] = useState<Step>("intro");
  const [h, setH] = useState<ExamTask[]>([]);
  const [l, setL] = useState<ExamTask[]>([]);
  const [hl, setHl] = useState({ hoeren: 0, lesen: 0, total: 0 });
  const [ws, setWs] = useState<{ schreiben: number | null; sprechen: number | null }>({ schreiben: null, sprechen: null });
  const [last, setLast] = useState<{ taken_at: string; scores: Record<string, number>; passed: boolean } | null>(null);
  const [saved, setSaved] = useState(false);
  const [due, setDue] = useState(false);

  useEffect(() => {
    Promise.all([loadTasks("hoeren"), loadTasks("lesen")]).then(([a, b]) => {
      setH(pickSet(a));
      setL(pickSet(b));
    });
    supabase.from("mock_exams").select("taken_at, scores, passed").eq("kind", "dtz").order("taken_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      setLast(data);
      setDue(!data || Date.now() - Date.parse(data.taken_at) > WEEK);
    });
  }, []);

  async function summarize() {
    const since = new Date(Date.now() - WEEK).toISOString();
    const { data } = await supabase.from("attempts").select("kind, scores").in("kind", ["writing", "speaking"]).gte("created_at", since).order("created_at", { ascending: false });
    const latest = (k: string) => (data ?? []).find((a) => a.kind === k)?.scores?.total ?? null;
    setWs({ schreiben: latest("writing"), sprechen: latest("speaking") });
    setStep("summary");
  }

  async function save() {
    const hlPoints = hl.hoeren + hl.lesen;
    const sPts = ws.schreiben === null ? null : Math.round(ws.schreiben * 20);
    const spPts = ws.sprechen === null ? null : Math.round(ws.sprechen * 100);
    // Сертификат: Sprechen ≥ A2 и (Hören+Lesen ≥ A2 или Schreiben ≥ A2).
    const passed = spPts !== null && spPts >= 35 && (hlPoints >= 20 || (sPts ?? 0) >= 7);
    await supabase.from("mock_exams").insert({ kind: "dtz", scores: { hoeren: hl.hoeren, lesen: hl.lesen, hl: hlPoints, schreiben: sPts, sprechen: spPts }, passed });
    setSaved(true);
  }

  if (step === "hoeren") return <ExamRunner key="h" part="hoeren" tasks={h} fixed={h} onDone={(c, n) => { setHl((x) => ({ ...x, hoeren: c, total: x.total + n })); setTimeout(() => setStep("lesen"), 2500); }} />;
  if (step === "lesen") return <ExamRunner key="l" part="lesen" tasks={l} fixed={l} onDone={(c, n) => { setHl((x) => ({ ...x, lesen: c, total: x.total + n })); setTimeout(summarize, 2500); }} />;

  if (step === "summary") {
    const hlPoints = hl.hoeren + hl.lesen;
    const good = hlPoints >= 33;
    return (
      <div className="space-y-4">
        {good && <Confetti />}
        <h1 className="text-2xl font-semibold">{t("result")}</h1>
        <GlassCard className="space-y-3">
          <div className="flex justify-between"><span lang="de">Hören + Lesen</span><b>{hlPoints} / {hl.total} · {dtzLevel("hl", hlPoints)}</b></div>
          <ReadinessBar label="Hören" value={hl.hoeren / 20} />
          <ReadinessBar label="Lesen" value={hl.lesen / 25} />
          <div className="flex justify-between"><span lang="de">Schreiben</span><b>{ws.schreiben === null ? t("notYet") : `${Math.round(ws.schreiben * 20)} / 20 · ${dtzLevel("schreiben", Math.round(ws.schreiben * 20))}`}</b></div>
          <div className="flex justify-between"><span lang="de">Sprechen</span><b>{ws.sprechen === null ? t("notYet") : `${Math.round(ws.sprechen * 100)} / 100`}</b></div>
        </GlassCard>
        <p className="text-sm text-violet-200">{t("mockWriteSpeak")}</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/exam/schreiben"><GlassButton className="w-full">Schreiben</GlassButton></Link>
          <Link href="/exam/sprechen"><GlassButton className="w-full">Sprechen</GlassButton></Link>
        </div>
        <GlassButton variant="primary" className="w-full" disabled={saved} onClick={save}>{saved ? t("saved") : t("saveResult")}</GlassButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("mockTitle")}</h1>
      <GlassCard className="space-y-2">
        <p>{t("mockHint")}</p>
        {due && <p className="text-fuchsia-300">{t("mockDue")}</p>}
      </GlassCard>
      {last && (
        <GlassCard className="text-sm">
          {t("mockLast")}: {new Date(last.taken_at).toLocaleDateString()} · Hören+Lesen {last.scores.hl}/45 · {last.passed ? t("passed") : t("notPassed")}
        </GlassCard>
      )}
      <GlassButton variant="primary" className="w-full" disabled={!h.length || !l.length} onClick={() => setStep("hoeren")}>
        {t("start")}
      </GlassButton>
    </div>
  );
}
