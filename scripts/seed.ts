// Загрузка JSON-сидов из /content в Supabase (service role, обходит RLS).
// Идемпотентно: upsert по id; audio_url не трогает (его пишет npm run tts).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fileSchema } from "../lib/content-schema";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const root = join(process.cwd(), "content");
let total = 0;

for (const level of readdirSync(root).sort()) {
  for (const f of readdirSync(join(root, level)).filter((f) => f.endsWith(".json")).sort()) {
    const file = fileSchema.parse(JSON.parse(readFileSync(join(root, level, f), "utf8")));
    const lesson = { ...file.lesson, level_id: file.level, topic_id: file.topic };
    const l = await db.from("lessons").upsert(lesson);
    if (l.error) throw new Error(`${f}: ${l.error.message}`);

    const rows = file.items.map((it, i) => ({
      ...it,
      level_id: file.level,
      topic_id: file.topic,
      lesson_id: file.lesson.id,
      sort: file.lesson.sort * 1000 + i,
    }));
    const r = await db.from("content_items").upsert(rows);
    if (r.error) throw new Error(`${f}: ${r.error.message}`);
    total += rows.length;
    console.log(`✓ ${level}/${f}: ${rows.length}`);
  }
}
console.log(`Готово: ${total} элементов`);
