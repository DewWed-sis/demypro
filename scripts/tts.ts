// Озвучка контента через Piper (локально) → public/audio/<id>.m4a (статикой, кэшируется PWA).
// Piper запускается через uvx (uv сам ставит Python и piper-tts), голос скачивается один раз в .piper/.
// Сжатие в AAC встроенным macOS afconvert (~14 КБ на фразу). Уже озвученные файлы пропускаются.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileSchema } from "../lib/content-schema";

const VOICE = process.env.PIPER_VOICE ?? "de_DE-thorsten-medium";
const dir = join(process.cwd(), ".piper");
const out = join(process.cwd(), "public", "audio");
mkdirSync(dir, { recursive: true });
mkdirSync(out, { recursive: true });

if (!existsSync(join(dir, `${VOICE}.onnx`))) {
  execFileSync("uvx", ["--from", "piper-tts", "python", "-m", "piper.download_voices", "--data-dir", dir, VOICE], { stdio: "inherit" });
}

// «A a — der Apfel» → «A, a, der Apfel»
const speakable = (de: string) => de.replace(/\s—\s/g, ", ").replace(/…/g, "");

const root = join(process.cwd(), "content");
const items = readdirSync(root).filter((d) => /^[ab][12]$/.test(d)).flatMap((level) =>
  readdirSync(join(root, level))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => fileSchema.parse(JSON.parse(readFileSync(join(root, level, f), "utf8"))).items),
);
const todo = items.filter((it) => !existsSync(join(out, `${it.id}.m4a`)));
console.log(`Озвучить: ${todo.length} из ${items.length}`);

for (const it of todo) {
  const text = it.kind === "word" || it.kind === "letter" ? `${speakable(it.de)}. ${it.example_de ?? ""}` : speakable(it.de);
  const wav = join(dir, `${it.id}.wav`);
  execFileSync("uvx", ["--from", "piper-tts", "piper", "--data-dir", dir, "-m", VOICE, "-f", wav, "--", text], { stdio: "ignore" });
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", wav, join(out, `${it.id}.m4a`)]);
  rmSync(wav);
  process.stdout.write(".");
}
console.log("\nГотово");
