"use client";

import type { Grade } from "ts-fsrs";
import { supabase } from "./supabase";
import { newCard, review, type StoredCard } from "./srs";
import { type Block, buildDailyPlan, ymd } from "./plan";

export type Item = {
  id: string;
  kind: "phrase" | "word" | "letter" | "number";
  de: string;
  ru: string;
  uk: string;
  cloze: string | null;
  example_de: string | null;
  example_ru: string | null;
  example_uk: string | null;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  audio_url: string | null;
  lesson_id: string | null;
};

export type QueueEntry = { item: Item; cardId: string | null; fsrs: StoredCard; type?: "content" | "error" };

const REVIEW_TYPES = ["content", "error"];

const ITEM_COLS = "id, kind, de, ru, uk, cloze, example_de, example_ru, example_uk, article, plural, audio_url, lesson_id";
const today = () => ymd();

/** Личная карточка из тетради ошибок: спереди правило и ошибочный вариант, сзади исправление. */
async function errorItems(ids: string[]) {
  if (!ids.length) return new Map<string, Item>();
  const { data } = await supabase.from("error_log").select("id, example, correction, rule_ru, rule_uk").in("id", ids);
  return new Map(
    (data ?? []).map((e) => [
      e.id as string,
      {
        id: e.id, kind: "phrase", de: e.correction, ru: e.rule_ru || "Исправь ошибку", uk: e.rule_uk || "Виправ помилку",
        cloze: `✗ ${e.example}`, example_de: null, example_ru: null, example_uk: null, article: null, plural: null, audio_url: null, lesson_id: null,
      } as Item,
    ]),
  );
}

async function itemsByIds(ids: string[]) {
  if (!ids.length) return new Map<string, Item>();
  const { data, error } = await supabase.from("content_items").select(ITEM_COLS).in("id", ids);
  if (error) throw error;
  return new Map((data as Item[]).map((i) => [i.id, i]));
}

export async function dueCount() {
  const { count } = await supabase
    .from("user_cards")
    .select("id", { count: "exact", head: true })
    .in("item_type", REVIEW_TYPES)
    .lte("due", new Date().toISOString());
  return count ?? 0;
}

export async function loadDue(limit = 60): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from("user_cards")
    .select("id, item_id, item_type, fsrs")
    .in("item_type", REVIEW_TYPES)
    .lte("due", new Date().toISOString())
    .order("due")
    .limit(limit);
  if (error) throw error;
  const items = await itemsByIds(data.filter((c) => c.item_type === "content").map((c) => c.item_id));
  const errors = await errorItems(data.filter((c) => c.item_type === "error").map((c) => c.item_id));
  return data.flatMap((c) => {
    const item = c.item_type === "error" ? errors.get(c.item_id) : items.get(c.item_id);
    return item ? [{ item, cardId: c.id as string, fsrs: c.fsrs as StoredCard, type: c.item_type as "content" | "error" }] : [];
  });
}

/** Новые карточки: следующие по порядку курса, которых ещё нет у пользователя. */
export async function loadNew(limit: number, lessonId?: string, fromLevel: "A1" | "A2" | "B1" = "A1"): Promise<QueueEntry[]> {
  // ponytail: тянем все id карточек пользователя (сотни-тысячи) — заменить на RPC с NOT EXISTS, если станет медленно.
  const { data: own } = await supabase.from("user_cards").select("item_id").eq("item_type", "content");
  const seen = new Set((own ?? []).map((c) => c.item_id));
  let q = supabase.from("content_items").select(ITEM_COLS).neq("kind", "letter").order("sort").limit(limit + seen.size);
  // Входной тест позволяет пропустить знакомый уровень: новые карточки — начиная с уровня профиля.
  if (lessonId) q = q.eq("lesson_id", lessonId);
  else q = q.in("level_id", ["A1", "A2", "B1"].slice(["A1", "A2", "B1"].indexOf(fromLevel)));
  const { data, error } = await q;
  if (error) throw error;
  return (data as Item[])
    .filter((i) => !seen.has(i.id))
    .slice(0, limit)
    .map((item) => ({ item, cardId: null, fsrs: newCard() }));
}

export async function rate(entry: QueueEntry, rating: Grade) {
  const { card, log } = review(entry.fsrs, rating);
  let cardId = entry.cardId;
  if (cardId) {
    const { error } = await supabase.from("user_cards").update({ fsrs: card, due: card.due }).eq("id", cardId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("user_cards")
      .upsert({ item_type: entry.type ?? "content", item_id: entry.item.id, fsrs: card, due: card.due }, { onConflict: "user_id,item_type,item_id" })
      .select("id")
      .single();
    if (error) throw error;
    cardId = data.id as string;
  }
  await supabase.from("reviews").insert({ card_id: cardId, rating, log });
  return { ...entry, cardId, fsrs: card };
}

/** План на сегодня: берём сохранённый или собираем новый. */
export async function todayPlan(goalMinutes: number) {
  const { data } = await supabase.from("daily_plans").select("*").eq("date", today()).maybeSingle();
  if (data) return data as { id: string; blocks: Block[]; completed: boolean };
  const blocks = buildDailyPlan(goalMinutes, await dueCount());
  const { data: created, error } = await supabase
    .from("daily_plans")
    .upsert({ date: today(), blocks }, { onConflict: "user_id,date" })
    .select()
    .single();
  if (error) throw error;
  return created as { id: string; blocks: Block[]; completed: boolean };
}

export async function completeBlock(kind: Block["kind"]) {
  const { data } = await supabase.from("daily_plans").select("id, blocks").eq("date", today()).maybeSingle();
  if (!data) return;
  const blocks = (data.blocks as Block[]).map((b) => (b.kind === kind ? { ...b, done: true } : b));
  await supabase
    .from("daily_plans")
    .update({
      blocks,
      completed: blocks.every((b) => b.done),
      minutes_done: blocks.reduce((s, b) => s + (b.done ? b.minutes : 0), 0),
    })
    .eq("id", data.id);
}

/** Фразы для shadowing: уже начатые пользователем, иначе первые фразы курса. */
export async function shadowingItems(limit: number): Promise<Item[]> {
  const { data: own } = await supabase.from("user_cards").select("item_id").eq("item_type", "content").limit(300);
  const ids = (own ?? []).map((c) => c.item_id as string);
  let q = supabase.from("content_items").select(ITEM_COLS).eq("kind", "phrase");
  q = ids.length >= limit ? q.in("id", ids) : q.order("sort").limit(limit * 3);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Item[]).sort(() => Math.random() - 0.5).slice(0, limit);
}
