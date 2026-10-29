// Озвучка диалогов Hören разными голосами Piper → public/audio/exam/<task>-<seg>.m4a.
// Каждая реплика синтезируется своим голосом, приводится к 22.05 кГц моно (afconvert) и склеивается с паузами.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { examFileSchema } from "../lib/content-schema";

const VOICES = { m: "de_DE-thorsten-medium", f: "de_DE-kerstin-low", n: "de_DE-ramona-low" } as const;
const RATE = 22050;
const dir = join(process.cwd(), ".piper");
const out = join(process.cwd(), "public", "audio", "exam");
mkdirSync(out, { recursive: true });

for (const v of Object.values(VOICES))
  if (!existsSync(join(dir, `${v}.onnx`)))
    execFileSync("uvx", ["--from", "piper-tts", "python", "-m", "piper.download_voices", "--data-dir", dir, v], { stdio: "inherit" });

/** PCM-данные из WAV (ищем чанк data, afconvert добавляет FLLR). */
function pcm(file: string) {
  const b = readFileSync(file);
  for (let i = 12; i < b.length; ) {
    const id = b.toString("ascii", i, i + 4);
    const size = b.readUInt32LE(i + 4);
    if (id === "data") return b.subarray(i + 8, i + 8 + size);
    i += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${file}`);
}

function wavHeader(len: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + len, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(len, 40);
  return h;
}

const gap = Buffer.alloc(Math.round(RATE * 0.6) * 2);
const tasks = examFileSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "content", "exam", "hoeren.json"), "utf8")));
for (const task of tasks) {
  const segments = task.meta.segments as { s: keyof typeof VOICES; de: string }[][];
  segments.forEach((lines, si) => {
    const target = join(out, `${task.id}-${si}.m4a`);
    if (existsSync(target)) return;
    const parts: Buffer[] = [gap];
    lines.forEach((line, li) => {
      const raw = join(dir, `x-${li}.wav`);
      const norm = join(dir, `y-${li}.wav`);
      execFileSync("uvx", ["--from", "piper-tts", "piper", "--data-dir", dir, "-m", VOICES[line.s], "-f", raw, "--", line.de], { stdio: "ignore" });
      execFileSync("afconvert", ["-f", "WAVE", "-d", `LEI16@${RATE}`, "-c", "1", raw, norm]);
      parts.push(pcm(norm), gap);
      rmSync(raw);
      rmSync(norm);
    });
    const data = Buffer.concat(parts);
    const wav = join(dir, "seg.wav");
    writeFileSync(wav, Buffer.concat([wavHeader(data.length), data]));
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", wav, target]);
    rmSync(wav);
    process.stdout.write(".");
  });
}
console.log("\nГотово");
