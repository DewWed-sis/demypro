import { z } from "zod";

export const GROQ_BASE = "https://api.groq.com/openai/v1";

// BYOK: ключ приходит только в заголовке x-groq-key, не сохраняется и не логируется.
const keySchema = z.string().trim().min(20).max(200).regex(/^[\x21-\x7e]+$/);

export function groqKey(req: Request): string | null {
  const r = keySchema.safeParse(req.headers.get("x-groq-key"));
  return r.success ? r.data : null;
}

export const noKey = () => Response.json({ error: "no_key" }, { status: 401 });
export const badInput = () => Response.json({ error: "bad_input" }, { status: 400 });

/** Ошибка Groq → понятный код для клиента; Retry-After пробрасываем для автоповтора. */
export function upstreamError(res: Response) {
  if (res.status === 401) return Response.json({ error: "bad_key" }, { status: 401 });
  if (res.status === 429) {
    const retry = res.headers.get("retry-after") ?? "10";
    return Response.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": retry } });
  }
  return Response.json({ error: "upstream", status: res.status }, { status: 502 });
}

export const groqHeaders = (key: string) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
