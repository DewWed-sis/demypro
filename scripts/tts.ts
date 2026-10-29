// Озвучка контента через Piper (локально) → Supabase Storage → content_items.audio_url.
// Piper запускается через uvx (uv сам ставит Python и piper-tts), голос скачивается один раз в .piper/.
// На macOS сжимаем в AAC встроенным afconvert (~10 КБ на фразу), иначе грузим WAV.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const VOICE = process.env.PIPER_VOICE ?? "de_DE-thorsten-medium";
const dir = join(process.cwd(), ".piper");
mkdirSync(dir, { recursive: true });

if (!existsSync(join(dir, `${VOICE}.onnx`))) {
  execFileSync("uvx", ["--from", "piper-tts", "python", "-m", "piper.download_voices", "--data-dir", dir, VOICE], {
    stdio: "inherit",
  });
}

// Для озвучки берём только немецкую часть: «A a — der Apfel» → «A, a, der Apfel».
const speakable = (de: string) => de.replace(/\s—\s/g, ", ").replace(/…/g, "");

const { data: items, error } = await db
  .from("content_items")
  .select("id, level_id, de, example_de, kind")
  .is("audio_url", null)
  .order("sort");
if (error) throw error;
console.log(`Без аудио: ${items.length}`);

for (const it of items) {
  const text = it.kind === "word" || it.kind === "letter" ? `${speakable(it.de)}. ${it.example_de ?? ""}` : speakable(it.de);
  const wav = join(dir, `${it.id}.wav`);
  execFileSync("uvx", ["--from", "piper-tts", "piper", "--data-dir", dir, "-m", VOICE, "-f", wav, "--", text]);
  let file = wav;
  if (process.platform === "darwin") {
    file = join(dir, `${it.id}.m4a`);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", wav, file]);
  }
  const ext = file.endsWith(".m4a") ? "m4a" : "wav";
  const path = `${it.level_id.toLowerCase()}/${it.id}.${ext}`;
  const contentType = ext === "m4a" ? "audio/mp4" : "audio/wav";
  const up = await db.storage.from("audio").upload(path, readFileSync(file), { contentType, upsert: true });
  if (up.error) throw new Error(`${it.id}: ${up.error.message}`);
  const publicUrl = db.storage.from("audio").getPublicUrl(path).data.publicUrl;
  await db.from("content_items").update({ audio_url: publicUrl }).eq("id", it.id);
  rmSync(wav);
  if (file !== wav) rmSync(file);
  console.log(`♪ ${it.id}`);
}
