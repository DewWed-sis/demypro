import { z } from "zod";

export const GROQ_BASE = "https://api.groq.com/openai/v1";

// Модель по умолчанию и запасная, если выбранную Groq отключил (llama-3.3-70b снята 16.08.2026).
export const DEFAULT_MODEL = "openai/gpt-oss-120b";

// BYOK: ключ приходит только в заголовке x-groq-key, не сохраняется и не логируется.
const keySchema = z.string().trim().min(20).max(200).regex(/^[\x21-\x7e]+$/);

export function groqKey(req: Request): string | null {
  const r = keySchema.safeParse(req.headers.get("x-groq-key"));
  return r.success ? r.data : null;
}

export const noKey = () => Response.json({ error: "no_key" }, { status: 401 });
export const badInput = () => Response.json({ error: "bad_input" }, { status: 400 });

/** Ошибка Groq → понятный код для клиента + текст Groq (без ключа); Retry-After пробрасываем для автоповтора. */
export async function upstreamError(res: Response) {
  if (res.status === 401) return Response.json({ error: "bad_key" }, { status: 401 });
  if (res.status === 429) {
    const retry = res.headers.get("retry-after") ?? "10";
    return Response.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": retry } });
  }
  const detail = await res
    .json()
    .then((b: { error?: { message?: string } }) => b.error?.message?.slice(0, 200))
    .catch(() => undefined);
  return Response.json({ error: "upstream", status: res.status, detail }, { status: 502 });
}

export const groqHeaders = (key: string) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

const isModelGone = async (res: Response) =>
  res.status === 404 || (res.status === 400 && /model|decommission/i.test(await res.clone().text()));

/**
 * POST /chat/completions. Рассуждающим моделям (gpt-oss) — низкое усилие рассуждения,
 * лимит токенов с запасом на рассуждение. Если модель снята — один повтор с моделью по умолчанию.
 */
export async function groqChat(key: string, body: { model: string; max_tokens: number } & Record<string, unknown>) {
  const send = (model: string) => {
    const reasoning = /gpt-oss/.test(model);
    const { max_tokens, ...rest } = body;
    return fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: groqHeaders(key),
      body: JSON.stringify({
        ...rest,
        model,
        max_completion_tokens: reasoning ? max_tokens + 1024 : max_tokens,
        ...(reasoning ? { reasoning_effort: "low" } : {}),
      }),
    });
  };
  const res = await send(body.model);
  if (!res.ok && body.model !== DEFAULT_MODEL && (await isModelGone(res))) return send(DEFAULT_MODEL);
  return res;
}
