"use client";

import { supabase } from "./supabase";
import { newCard } from "./srs";
import type { Evaluation, ExtractedError } from "./ai/schemas";

export type I18n = { de: string; ru: string; uk: string };
export type ExamTask = {
  id: string;
  part: "hoeren" | "lesen" | "schreiben" | "sprechen";
  teil: number;
  type: string;
  level_id: "A1" | "A2" | "B1";
  topic_id: string | null;
  instructions: I18n;
  text: string | null;
  audio_url: string | null;
  options: unknown[];
  answers: unknown[];
  meta: Record<string, unknown>;
  time_limit_sec: number | null;
};

export async function loadTasks(part: ExamTask["part"]) {
  const { data, error } = await supabase.from("exam_tasks").select("*").eq("part", part).order("teil").order("id");
  if (error) throw error;
  return data as ExamTask[];
}

export async function saveAttempt(a: {
  kind: "writing" | "speaking" | "hoeren" | "lesen";
  exam_task_id?: string;
  part: string;
  prompt?: unknown;
  text?: string;
  transcript?: string;
  scores: Record<string, number>;
  level_estimate?: string;
  feedback?: unknown;
}) {
  const { data, error } = await supabase.from("attempts").insert(a).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** Ошибки в тетрадь: повтор того же исправления → count+1, новое → запись + личная FSRS-карточка. */
export async function saveErrors(errors: ExtractedError[], attemptId: string | null) {
  for (const e of errors) {
    const { data: existing } = await supabase
      .from("error_log")
      .select("id, count")
      .eq("type", e.type)
      .ilike("correction", e.correction)
      .maybeSingle();
    if (existing) {
      await supabase.from("error_log").update({ count: existing.count + 1, last_seen: new Date().toISOString(), example: e.example }).eq("id", existing.id);
      continue;
    }
    const { data, error } = await supabase
      .from("error_log")
      .insert({ type: e.type, example: e.example, correction: e.correction, rule_ru: e.rule_ru, rule_uk: e.rule_uk, attempt_id: attemptId })
      .select("id")
      .single();
    if (error) throw error;
    const card = newCard();
    await supabase.from("user_cards").insert({ item_type: "error", item_id: data.id, fsrs: card, due: card.due });
  }
}

export const totalScore = (e: Pick<Evaluation, "scores">) =>
  (e.scores.task + e.scores.coherence + e.scores.grammar + e.scores.vocabulary) / 20;
