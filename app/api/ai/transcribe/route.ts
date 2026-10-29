import { z } from "zod";
import { badInput, GROQ_BASE, groqKey, noKey, upstreamError } from "@/lib/ai/groq";

// Речь → текст: Whisper large-v3-turbo, немецкий. Аудио не сохраняется.
const audio = z
  .instanceof(File)
  .refine((f) => f.size > 0 && f.size <= 4_000_000, "size")
  .refine((f) => /^(audio|video)\/(webm|mp4|aac|mpeg|ogg|wav|x-m4a)/.test(f.type), "type");

export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();
  const form = await req.formData().catch(() => null);
  const file = audio.safeParse(form?.get("file"));
  if (!file.success) return badInput();

  const out = new FormData();
  out.append("file", file.data, file.data.name || "rec.webm");
  out.append("model", "whisper-large-v3-turbo");
  out.append("language", "de");
  out.append("temperature", "0");
  out.append("response_format", "json");
  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: out,
  });
  if (!res.ok) return await upstreamError(res);
  const { text } = (await res.json()) as { text: string };
  return Response.json({ text: text.trim() });
}
