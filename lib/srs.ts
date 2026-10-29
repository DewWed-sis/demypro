import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

// Обёртка над ts-fsrs: состояние карты хранится как JSON в user_cards.fsrs.
export { Rating };
export type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };

const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 });

const toCard = (s: StoredCard): Card => ({
  ...s,
  due: new Date(s.due),
  last_review: s.last_review ? new Date(s.last_review) : undefined,
});

const toStored = (c: Card): StoredCard => ({
  ...c,
  due: c.due.toISOString(),
  last_review: c.last_review?.toISOString(),
});

export const newCard = (now = new Date()): StoredCard => toStored(createEmptyCard(now));

export function review(card: StoredCard, rating: Grade, now = new Date()) {
  const { card: next, log } = scheduler.next(toCard(card), now, rating);
  return { card: toStored(next), log: { ...log, due: log.due.toISOString(), review: log.review.toISOString() } };
}

// Подписи кнопок: через сколько карта вернётся при каждой оценке.
export function previewIntervals(card: StoredCard, now = new Date()): Record<Grade, string> {
  const p = scheduler.repeat(toCard(card), now);
  const fmt = (d: Date) => {
    const min = Math.round((d.getTime() - now.getTime()) / 60000);
    if (min < 60) return `${Math.max(1, min)} мин`;
    if (min < 1440) return `${Math.round(min / 60)} ч`;
    return `${Math.round(min / 1440)} д`;
  };
  return {
    [Rating.Again]: fmt(p[Rating.Again].card.due),
    [Rating.Hard]: fmt(p[Rating.Hard].card.due),
    [Rating.Good]: fmt(p[Rating.Good].card.due),
    [Rating.Easy]: fmt(p[Rating.Easy].card.due),
  } as Record<Grade, string>;
}
