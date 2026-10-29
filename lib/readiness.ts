// Шкала готовности к DTZ по частям (0..1): среднее по последним попыткам, LiD — доля освоенных вопросов.
export type AttemptRow = { kind: string; scores: { ratio?: number; total?: number } | null; created_at: string };
export type Readiness = { hoeren: number; lesen: number; schreiben: number; sprechen: number; lid: number };

const LAST = 5;

export function readiness(attempts: AttemptRow[], lidMastered: number, lidTotal = 310): Readiness {
  const avg = (kind: string, key: "ratio" | "total") => {
    const xs = attempts
      .filter((a) => a.kind === kind && typeof a.scores?.[key] === "number")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, LAST)
      .map((a) => a.scores![key]!);
    return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
  };
  return {
    hoeren: avg("hoeren", "ratio"),
    lesen: avg("lesen", "ratio"),
    schreiben: avg("writing", "total"),
    sprechen: avg("speaking", "total"),
    lid: Math.min(1, lidMastered / lidTotal),
  };
}

/** Уровень по шкале g.a.s.t.: Hören+Lesen из 45 (33+ B1, 20+ A2); Schreiben из 20 (15+ B1, 7+ A2). */
export function dtzLevel(part: "hl" | "schreiben", points: number) {
  const [b1, a2] = part === "hl" ? [33, 20] : [15, 7];
  return points >= b1 ? "B1" : points >= a2 ? "A2" : "<A2";
}

/** Слово, пропущенное в cloze: «Ich bin ___ hier» + «Ich bin gern hier» → «gern». */
export function clozeAnswer(de: string, cloze: string) {
  const [pre, post = ""] = cloze.split("___");
  return de.slice(pre.length, de.length - post.length);
}
