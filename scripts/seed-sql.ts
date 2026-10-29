// npm run seed: генерирует supabase/seed.sql из /content. Запуск — в SQL Editor (без service-ключа) или supabase db reset.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileSchema } from "../lib/content-schema";

const q = (v: unknown): string =>
  v === undefined || v === null ? "null" : Array.isArray(v) ? `array[${v.map(q).join(",")}]::text[]` : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

const root = join(process.cwd(), "content");
const out: string[] = [];
for (const level of readdirSync(root).sort()) {
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
console.log(out.join("\n\n"));
