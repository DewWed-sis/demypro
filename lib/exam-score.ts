import type { Evaluation } from "./ai/schemas";

// Доля от максимума DTZ Schreiben: 4 критерия × 5 баллов.
export const totalScore = (e: Pick<Evaluation, "scores">) =>
  (e.scores.task + e.scores.coherence + e.scores.grammar + e.scores.vocabulary) / 20;
