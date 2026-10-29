// План дня: собирается автоматически, пользователю ничего выбирать не нужно.
export type BlockKind = "review" | "new" | "speak" | "write" | "lid";
export type Block = { kind: BlockKind; minutes: number; done: boolean };

// Локальная дата пользователя в формате YYYY-MM-DD.
export const ymd = (d = new Date()) => d.toLocaleDateString("sv-SE");

/**
 * Базовая пропорция 10/10/10/5–10 масштабируется под цель минут.
 * Если повторять нечего — время повторения уходит в новое.
 * Письмо и LiD чередуются по дням.
 */
export function buildDailyPlan(goalMinutes: number, dueCount: number, date = new Date()): Block[] {
  const unit = goalMinutes / 37.5; // 10+10+10+7.5 при цели 37.5 мин
  const m = (base: number) => Math.max(3, Math.round(base * unit));
  const dayIndex = Math.floor(Date.parse(ymd(date)) / 86_400_000);
  const blocks: Block[] = [];
  if (dueCount > 0) blocks.push({ kind: "review", minutes: m(10), done: false });
  blocks.push({ kind: "new", minutes: dueCount > 0 ? m(10) : m(20), done: false });
  blocks.push({ kind: "speak", minutes: m(10), done: false });
  blocks.push({ kind: dayIndex % 2 === 0 ? "write" : "lid", minutes: m(7.5), done: false });
  return blocks;
}

export const planProgress = (blocks: Block[]) => {
  const total = blocks.reduce((s, b) => s + b.minutes, 0);
  return total ? blocks.reduce((s, b) => s + (b.done ? b.minutes : 0), 0) / total : 0;
};

/** Стрик: +1 если вчера был активный день, сброс до 1 если был пропуск, без изменений если сегодня уже засчитан. */
export function nextStreak(streak: number, lastActive: string | null, today = new Date()) {
  const t = ymd(today);
  if (lastActive === t) return { streak, last_active_date: t };
  const yesterday = ymd(new Date(today.getTime() - 86_400_000));
  return { streak: lastActive === yesterday ? streak + 1 : 1, last_active_date: t };
}

// Сколько новых карточек давать за блок «новое»: ~1 карточка в минуту.
export const newCardsFor = (minutes: number) => Math.max(5, Math.round(minutes));
