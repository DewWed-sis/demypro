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
