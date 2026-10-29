import type { z } from "zod";
import { groqChat, upstreamError } from "./groq";

/** Запрос к LLM с JSON-ответом и валидацией Zod; при невалидном JSON — один повтор. */
export async function chatJson<T extends z.ZodType>(key: string, model: string, system: string, user: string, schema: T) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await groqChat(key, {
      model,
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    if (!res.ok) {
      if (res.status === 400 && attempt === 0) continue; // json_validate_failed у Groq — повторяем
      return { error: await upstreamError(res) };
    }
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    try {
      const parsed = schema.safeParse(JSON.parse(body.choices[0].message.content));
      if (parsed.success) return { data: parsed.data as z.infer<T> };
    } catch {}
  }
  return { error: Response.json({ error: "upstream" }, { status: 502 }) };
}
