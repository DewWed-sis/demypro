"use client";

import { supabase } from "./supabase";
import { newCard, Rating, review, type StoredCard } from "./srs";

export type LidTopic = "demokratie" | "geschichte" | "recht" | "gesellschaft" | "land";
export const LID_TOPICS: LidTopic[] = ["demokratie", "geschichte", "recht", "gesellschaft", "land"];

export type LidQuestion = {
  id: number;
  question: string;
  answers: string[];
  correct: number;
  topic: LidTopic;
  bundesland: string | null;
  image_url: string | null;
  question_ru: string | null;
  question_uk: string | null;
  answers_ru: string[] | null;
  answers_uk: string[] | null;
  explanation_ru: string | null;
  explanation_uk: string | null;
};

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

async function questions(filter?: { topic?: LidTopic; ids?: number[] }) {
  let q = supabase.from("lid_questions").select("*").order("id");
  if (filter?.topic) q = q.eq("topic", filter.topic);
  if (filter?.ids) q = q.in("id", filter.ids);
  const { data, error } = await q;
  if (error) throw error;
  return data as LidQuestion[];
}

/** Тренировка: сначала просроченные по FSRS, потом новые, потом остальные. */
export async function practiceQueue(topic?: LidTopic) {
  const [qs, cards] = await Promise.all([
    questions(topic ? { topic } : undefined),
    supabase.from("user_cards").select("item_id, due").eq("item_type", "lid"),
  ]);
  const due = new Map((cards.data ?? []).map((c) => [Number(c.item_id), c.due as string]));
  const now = new Date().toISOString();
  const overdue = qs.filter((q) => due.has(q.id) && due.get(q.id)! <= now);
  const fresh = qs.filter((q) => !due.has(q.id));
  const rest = qs.filter((q) => due.has(q.id) && due.get(q.id)! > now);
  return [...shuffle(overdue), ...shuffle(fresh), ...shuffle(rest)];
}

export async function mistakesQueue() {
  const { data } = await supabase.from("lid_progress").select("question_id").eq("last_correct", false);
  const ids = (data ?? []).map((r) => r.question_id as number);
  return ids.length ? shuffle(await questions({ ids })) : [];
}

/** Пробный тест как в BAMF: 30 общих + 3 вопроса федеральной земли. */
export async function mockTestSet() {
  const all = await questions();
  return [...shuffle(all.filter((q) => !q.bundesland)).slice(0, 30), ...shuffle(all.filter((q) => q.bundesland === "NW")).slice(0, 3)];
}

/** Записать ответ: статистика + FSRS-карточка (верно → Good, неверно → Again). */
export async function recordAnswer(q: LidQuestion, correct: boolean) {
  const { data: prev } = await supabase.from("lid_progress").select("*").eq("question_id", q.id).maybeSingle();
  await supabase.from("lid_progress").upsert(
    {
      question_id: q.id,
      correct_count: (prev?.correct_count ?? 0) + (correct ? 1 : 0),
      wrong_count: (prev?.wrong_count ?? 0) + (correct ? 0 : 1),
      last_correct: correct,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" },
  );

  const { data: card } = await supabase
    .from("user_cards")
    .select("id, fsrs")
    .eq("item_type", "lid")
    .eq("item_id", String(q.id))
    .maybeSingle();
  const next = review((card?.fsrs as StoredCard) ?? newCard(), correct ? Rating.Good : Rating.Again);
  const { data: saved } = await supabase
    .from("user_cards")
    .upsert({ item_type: "lid", item_id: String(q.id), fsrs: next.card, due: next.card.due }, { onConflict: "user_id,item_type,item_id" })
    .select("id")
    .single();
  if (saved) await supabase.from("reviews").insert({ card_id: saved.id, rating: correct ? Rating.Good : Rating.Again, log: next.log });
}

export async function topicStats() {
  const [{ data: qs }, { data: prog }] = await Promise.all([
    supabase.from("lid_questions").select("id, topic"),
    supabase.from("lid_progress").select("question_id, last_correct"),
  ]);
  const ok = new Set((prog ?? []).filter((p) => p.last_correct).map((p) => p.question_id));
  const stats = Object.fromEntries(LID_TOPICS.map((t) => [t, { total: 0, ok: 0 }])) as Record<LidTopic, { total: number; ok: number }>;
  for (const q of qs ?? []) {
    stats[q.topic as LidTopic].total++;
    if (ok.has(q.id)) stats[q.topic as LidTopic].ok++;
  }
  const mistakes = (prog ?? []).filter((p) => p.last_correct === false).length;
  return { stats, mistakes, learned: ok.size, total: qs?.length ?? 0 };
}

export async function saveMockTest(correct: number, total: number) {
  await supabase.from("mock_exams").insert({ kind: "lid", scores: { correct, total }, passed: correct >= 17 });
}
