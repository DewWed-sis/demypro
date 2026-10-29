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

describe("diff", () => {
  it("совпадение без учёта регистра и пунктуации, пропуски и лишние слова", async () => {
    const { wordDiff } = await import("./diff");
    expect(wordDiff("Wie geht's dir?", "wie gehts dir").score).toBe(1);
    const d = wordDiff("Ich heiße Anna.", "Ich heisse äh Anna");
    expect(d.score).toBe(1);
    expect(d.tokens.filter((x) => x.kind === "extra").map((x) => x.word)).toEqual(["äh"]);
    const m = wordDiff("Ich wohne in Köln", "Ich wohne Köln");
    expect(m.tokens.find((x) => x.kind === "miss")?.word).toBe("in");
    expect(m.score).toBe(0.75);
  });
});

describe("readiness", () => {
  it("среднее по последним 5 попыткам, LiD — доля", async () => {
    const { readiness, dtzLevel, clozeAnswer } = await import("./readiness");
    const rows = [0.2, 0.4, 0.6, 0.8, 1, 1].map((r, i) => ({ kind: "hoeren", scores: { ratio: r }, created_at: `2026-01-0${i + 1}` }));
    const r = readiness([...rows, { kind: "writing", scores: { total: 0.5 }, created_at: "2026-01-01" }], 155);
    expect(r.hoeren).toBeCloseTo((0.4 + 0.6 + 0.8 + 1 + 1) / 5);
    expect(r.schreiben).toBe(0.5);
    expect(r.sprechen).toBe(0);
    expect(r.lid).toBe(0.5);
    expect([dtzLevel("hl", 33), dtzLevel("hl", 32), dtzLevel("hl", 19), dtzLevel("schreiben", 15)]).toEqual(["B1", "A2", "<A2", "B1"]);
    expect(clozeAnswer("Ich bin seit einem Jahr hier.", "Ich bin ___ einem Jahr hier.")).toBe("seit");
  });
});

describe("grammar", () => {
  it("карточки валидны, ответы в пределах вариантов", async () => {
    const { grammarSchema } = await import("./content-schema");
    const g = grammarSchema.parse(JSON.parse(readFileSync(join(__dirname, "..", "content", "grammar.json"), "utf8")));
    expect(g.length).toBeGreaterThanOrEqual(12);
    for (const x of g) for (const q of x.quiz) expect(q.answer, x.id).toBeLessThan(q.options.length);
  });
});

describe("exam tasks", () => {
  it("Hören 20 + Lesen 25 заданий на вариант (формат g.a.s.t.)", async () => {
    const { examFileSchema } = await import("./content-schema");
    const read = (f: string) => examFileSchema.parse(JSON.parse(readFileSync(join(__dirname, "..", "content", "exam", f), "utf8")));
    for (const [file, perSet] of [["hoeren.json", 20], ["lesen.json", 25]] as const) {
      const tasks = read(file);
      for (const satz of new Set(tasks.map((t) => t.meta.satz))) {
        const qs = tasks.filter((t) => t.meta.satz === satz).flatMap((t) => t.options as { answer: number; choices: string[] }[]);
        expect(qs.length, `${file} ${satz}`).toBe(perSet);
        for (const q of qs) expect(q.answer).toBeLessThan(q.choices.length);
      }
    }
  });
});
