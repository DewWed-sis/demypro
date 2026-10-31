import { z } from "zod";

// Общие схемы AI: вход роутов и строгий JSON-ответ модели (валидация Zod, при невалидном — один повтор).
export const ERROR_TYPES = [
  "word_order_v2",
  "verb_final",
  "article_gender",
  "case_dativ",
  "case_akkusativ",
  "preposition",
  "verb_conjugation",
  "tense_perfekt",
  "modal_verbs",
  "reflexive",
  "konjunktiv",
  "plural",
  "adjective_ending",
  "negation",
  "spelling",
  "vocabulary",
  "other",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

const score = z.coerce.number().min(0).max(5).catch(0);
const errType = z.enum(ERROR_TYPES).catch("other");

export const correction = z.object({
  original: z.string(),
  fixed: z.string(),
  rule_ru: z.string().catch(""),
  rule_uk: z.string().catch(""),
});

export const evaluation = z.object({
  points_covered: z.array(z.string()).catch([]),
  scores: z.object({ task: score, coherence: score, grammar: score, vocabulary: score }),
  level_estimate: z.enum(["A1", "A2", "B1"]).catch("A2"),
  corrected_text: z.string().catch(""),
  corrections: z.array(correction).catch([]),
  errors: z.array(z.object({ type: errType, example: z.string() })).catch([]),
  summary_ru: z.string().catch(""),
  summary_uk: z.string().catch(""),
});
export type Evaluation = z.infer<typeof evaluation>;

export const speakingEvaluation = evaluation.extend({ next_question: z.string().catch("") });
export type SpeakingEvaluation = z.infer<typeof speakingEvaluation>;

export const extractedErrors = z.object({
  errors: z
    .array(z.object({ type: errType, example: z.string().min(1), correction: z.string().min(1), rule_ru: z.string().catch(""), rule_uk: z.string().catch("") }))
    .catch([]),
});
export type ExtractedError = z.infer<typeof extractedErrors>["errors"][number];

// Вход роутов
export const model = z.string().regex(/^[\w.\-/:]+$/).max(100);
export const level = z.enum(["A1", "A2", "B1"]);
const text = (max: number) => z.string().trim().min(1).max(max);

export const chatInput = z.object({
  model,
  level,
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  task: text(1500),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: text(2000) })).max(40),
  hint: z.enum(["ru", "uk"]).optional(),
});

export const speakingInput = z.object({ model, level, part: z.number().int().min(1).max(3), task: text(1500), transcript: text(8000) });
export const writingInput = z.object({ model, level, task: text(1500), points: z.array(text(300)).min(1).max(6), text: text(5000) });
export const extractInput = z.object({ model, text: text(8000), corrections: z.array(correction).max(40).default([]) });

export const dictionaryInput = z.object({ model, query: text(80) });
const str = z.string().catch("");
export const dictionaryEntry = z.object({
  found: z.boolean().catch(true),
  lemma: z.string().min(1),
  pos: z.enum(["noun", "verb", "adjective", "adverb", "preposition", "phrase", "other"]).catch("other"),
  article: z.enum(["der", "die", "das"]).nullable().catch(null),
  plural: z.string().nullable().catch(null),
  forms: str,
  ru: str,
  uk: str,
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).catch("B1"),
  grammar_ru: str,
  grammar_uk: str,
  examples: z.array(z.object({ de: z.string(), ru: str, uk: str })).max(5).catch([]),
});
