import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDailyPlan, nextStreak, planProgress } from "./plan";
import { newCard, previewIntervals, Rating, review } from "./srs";
import { fileSchema } from "./content-schema";

describe("srs", () => {
  it("Good отодвигает карту в будущее, Again — ближе, чем Good", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const c = newCard(now);
    const good = review(c, Rating.Good, now).card;
    const again = review(c, Rating.Again, now).card;
    expect(new Date(good.due) > now).toBe(true);
    expect(new Date(again.due) <= new Date(good.due)).toBe(true);
    expect(good.reps).toBe(1);
    expect(Object.keys(previewIntervals(c, now))).toHaveLength(4);
  });

  it("состояние переживает JSON-сериализацию", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const c = JSON.parse(JSON.stringify(review(newCard(now), Rating.Good, now).card));
    const later = new Date(new Date(c.due).getTime() + 1000);
    expect(review(c, Rating.Good, later).card.reps).toBe(2);
  });
});

describe("plan", () => {
  it("35 минут ≈ 10/10/10/7, чередование письма и LiD", () => {
    const a = buildDailyPlan(35, 5, new Date("2026-01-01"));
    const b = buildDailyPlan(35, 5, new Date("2026-01-02"));
    expect(a.map((x) => x.kind).slice(0, 3)).toEqual(["review", "new", "speak"]);
    expect(new Set([a[3].kind, b[3].kind])).toEqual(new Set(["write", "lid"]));
    const total = a.reduce((s, x) => s + x.minutes, 0);
    expect(total).toBeGreaterThanOrEqual(30);
    expect(total).toBeLessThanOrEqual(40);
  });

  it("без карт к повторению нет блока review", () => {
    expect(buildDailyPlan(35, 0).some((b) => b.kind === "review")).toBe(false);
  });

  it("прогресс считается по минутам", () => {
    const p = buildDailyPlan(35, 0);
    p[0].done = true;
    expect(planProgress(p)).toBeCloseTo(p[0].minutes / p.reduce((s, b) => s + b.minutes, 0));
  });

  it("стрик", () => {
    const today = new Date("2026-03-10T12:00:00Z");
    expect(nextStreak(4, "2026-03-09", today).streak).toBe(5);
    expect(nextStreak(4, "2026-03-10", today).streak).toBe(4);
    expect(nextStreak(4, "2026-03-01", today).streak).toBe(1);
    expect(nextStreak(0, null, today).streak).toBe(1);
  });
});

describe("content", () => {
  it("все JSON-сиды валидны, id уникальны", () => {
    const ids = new Set<string>();
    const root = join(__dirname, "..", "content");
    for (const level of readdirSync(root).filter((d) => /^[ab][12]$/.test(d))) {
      for (const f of readdirSync(join(root, level)).filter((f) => f.endsWith(".json"))) {
        const data = fileSchema.parse(JSON.parse(readFileSync(join(root, level, f), "utf8")));
        for (const it of data.items) {
          expect(ids.has(it.id), `duplicate ${it.id}`).toBe(false);
          ids.add(it.id);
          if (it.cloze) expect(it.de.startsWith(it.cloze.split("___")[0]), it.id).toBe(true);
        }
      }
    }
    expect(ids.size).toBeGreaterThanOrEqual(300);
  });
});

describe("lid", () => {
  it("310 официальных вопросов, NRW 301–310, переводы согласованы", async () => {
    const { lidRows } = await import("./lid-source");
    const rows = lidRows();
    expect(rows).toHaveLength(310);
    expect(rows.filter((r) => r.bundesland === "NW").map((r) => r.id)).toEqual([301, 302, 303, 304, 305, 306, 307, 308, 309, 310]);
    for (const r of rows) {
      expect(r.answers, `#${r.id}`).toHaveLength(4);
      expect(r.correct).toBeGreaterThanOrEqual(0);
      expect(r.correct).toBeLessThan(4);
      if (r.answers_ru) expect(r.answers_ru, `#${r.id} ru`).toHaveLength(4);
      if (r.answers_uk) expect(r.answers_uk, `#${r.id} uk`).toHaveLength(4);
    }
  });
});
