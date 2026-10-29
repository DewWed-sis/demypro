// npm run seed: генерирует supabase/seed.sql из /content. Запуск — в SQL Editor (без service-ключа) или supabase db reset.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { examFileSchema, fileSchema, grammarSchema } from "../lib/content-schema";
import { lidRows } from "../lib/lid-source";

const q = (v: unknown): string =>
  v === undefined || v === null ? "null" : Array.isArray(v) ? `array[${v.map(q).join(",")}]::text[]` : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

const root = join(process.cwd(), "content");
const out: string[] = [];
for (const level of readdirSync(root).filter((d) => /^[ab][12]$/.test(d)).sort()) {
  for (const f of readdirSync(join(root, level)).filter((f) => f.endsWith(".json")).sort()) {
    const file = fileSchema.parse(JSON.parse(readFileSync(join(root, level, f), "utf8")));
    const l = file.lesson;
    out.push(
      `insert into public.lessons (id, level_id, topic_id, kind, title_ru, title_uk, sort) values (${[l.id, file.level, file.topic, l.kind, l.title_ru, l.title_uk, l.sort].map(q).join(",")}) on conflict (id) do update set title_ru = excluded.title_ru, title_uk = excluded.title_uk, sort = excluded.sort, kind = excluded.kind;`,
    );
    const cols = ["id", "level_id", "topic_id", "lesson_id", "kind", "de", "ru", "uk", "cloze", "example_de", "example_ru", "example_uk", "article", "plural", "tags", "sort"] as const;
    const rows = file.items.map((it, i) =>
      `(${[it.id, file.level, file.topic, l.id, it.kind, it.de, it.ru, it.uk, it.cloze, it.example_de, it.example_ru, it.example_uk, it.article, it.plural, it.tags, l.sort * 1000 + i].map(q).join(",")})`,
    );
    const upd = cols.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ");
    out.push(`insert into public.content_items (${cols.join(",")}) values\n${rows.join(",\n")}\non conflict (id) do update set ${upd};`);
  }
}
// LiD: официальный каталог BAMF (310 вопросов)
const lidCols = ["id", "question", "answers", "correct", "topic", "bundesland", "image_url", "question_ru", "question_uk", "answers_ru", "answers_uk", "explanation_ru", "explanation_uk"] as const;
const j = (v: unknown) => (v == null ? "null" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`);
const lid = lidRows().map((r) =>
  `(${[q(r.id), q(r.question), j(r.answers), q(r.correct), q(r.topic), q(r.bundesland), q(r.image_url), q(r.question_ru), q(r.question_uk), j(r.answers_ru), j(r.answers_uk), q(r.explanation_ru), q(r.explanation_uk)].join(",")})`,
);
out.push(`insert into public.lid_questions (${lidCols.join(",")}) values\n${lid.join(",\n")}\non conflict (id) do update set ${lidCols.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ")};`);

// Задания DTZ
const examDir = join(root, "exam");
const examCols = ["id", "part", "teil", "type", "level_id", "topic_id", "instructions", "text", "audio_url", "options", "answers", "meta", "time_limit_sec"] as const;
const exam = readdirSync(examDir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .sort()
  .flatMap((f) => examFileSchema.parse(JSON.parse(readFileSync(join(examDir, f), "utf8"))))
  .map((e) => `(${[q(e.id), q(e.part), q(e.teil), q(e.type), q(e.level), q(e.topic), j(e.instructions), q(e.text), q(null), j(e.options), j(e.answers.length ? e.answers : e.options.map((o) => (o as { answer?: number }).answer ?? null)), j(e.meta), q(e.time_limit_sec)].join(",")})`);
out.push(`insert into public.exam_tasks (${examCols.join(",")}) values\n${exam.join(",\n")}\non conflict (id) do update set ${examCols.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ")};`);

// Грамматика
const gCols = ["id", "level_id", "title_ru", "title_uk", "rule_ru", "rule_uk", "examples", "quiz", "error_types", "sort"] as const;
const grammar = grammarSchema
  .parse(JSON.parse(readFileSync(join(root, "grammar.json"), "utf8")))
  .map((g, i) => `(${[q(g.id), q(g.level), q(g.title_ru), q(g.title_uk), q(g.rule_ru), q(g.rule_uk), j(g.examples), j(g.quiz), q(g.error_types), q(i)].join(",")})`);
out.push(`insert into public.grammar_points (${gCols.join(",")}) values\n${grammar.join(",\n")}\non conflict (id) do update set ${gCols.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ")};`);

console.log(out.join("\n\n"));
