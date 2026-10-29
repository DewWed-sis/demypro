import { GROQ_BASE, groqKey, noKey } from "@/lib/ai/groq";

// Проверка ключа + список чат-моделей для выбора в настройках.
export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();

  const res = await fetch(`${GROQ_BASE}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return Response.json({ ok: false, status: res.status }, { status: res.status === 401 ? 401 : 502 });

  const { data } = (await res.json()) as { data: { id: string; active?: boolean }[] };
  const models = data
    .filter((m) => m.active !== false && !/whisper|guard|tts|orpheus|playai|prompt/i.test(m.id))
    .map((m) => m.id)
    .sort();
  return Response.json({ ok: true, models });
}
