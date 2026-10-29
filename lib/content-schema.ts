import { z } from "zod";

// Формат JSON-сидов в /content. Поля совпадают с колонками content_items.
export const itemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.enum(["phrase", "word", "letter", "number"]).default("phrase"),
    de: z.string().min(1),
    ru: z.string().min(1),
    uk: z.string().min(1),
    cloze: z.string().includes("___").optional(),
    example_de: z.string().optional(),
    example_ru: z.string().optional(),
    example_uk: z.string().optional(),
    article: z.enum(["der", "die", "das"]).optional(),
    plural: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .refine((i) => i.kind !== "word" || i.example_de, { message: "word needs example_de" });

export const fileSchema = z.object({
  level: z.enum(["A1", "A2", "B1"]),
  topic: z.string().nullable(),
  lesson: z.object({
    id: z.string(),
    kind: z.enum(["vocab", "grammar", "start", "exam"]).default("vocab"),
    title_ru: z.string(),
    title_uk: z.string(),
    sort: z.number().int(),
  }),
  items: z.array(itemSchema).min(1),
});

export type ContentFile = z.infer<typeof fileSchema>;
export type ContentItem = z.infer<typeof itemSchema>;

// Задания DTZ (/content/exam/*.json) → exam_tasks.
const i18n = z.object({ de: z.string(), ru: z.string(), uk: z.string() });
export const examTaskSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  part: z.enum(["hoeren", "lesen", "schreiben", "sprechen"]),
  teil: z.number().int().min(1).max(5),
  type: z.string(),
  level: z.enum(["A1", "A2", "B1"]),
  topic: z.string().nullable().default(null),
  instructions: i18n,
  text: z.string().optional(),
  options: z.array(z.unknown()).default([]),
  answers: z.array(z.unknown()).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
  time_limit_sec: z.number().int().optional(),
});
export const examFileSchema = z.array(examTaskSchema).min(1);
export type ExamTaskSeed = z.infer<typeof examTaskSchema>;
