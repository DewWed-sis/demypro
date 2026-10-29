"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { ExamRunner } from "@/components/exam-runner";
import { loadTasks, type ExamTask } from "@/lib/exam";

export default function Page() {
  const { t } = useApp();
  const [tasks, setTasks] = useState<ExamTask[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadTasks("hoeren").then(setTasks).catch((e: Error) => setError(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <h1 lang="de" className="text-2xl font-semibold">Hören</h1>
      {tasks ? <ExamRunner part="hoeren" tasks={tasks} /> : <p className="text-violet-200">{error || t("loading")}</p>}
    </div>
  );
}
