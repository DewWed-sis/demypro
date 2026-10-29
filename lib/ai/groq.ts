import { z } from "zod";

export const GROQ_BASE = "https://api.groq.com/openai/v1";

// BYOK: ключ приходит только в заголовке x-groq-key, не сохраняется и не логируется.
const keySchema = z.string().trim().min(20).max(200).regex(/^[\x21-\x7e]+$/);

export function groqKey(req: Request): string | null {
  const r = keySchema.safeParse(req.headers.get("x-groq-key"));
  return r.success ? r.data : null;
}

export const noKey = () => Response.json({ error: "no_key" }, { status: 401 });
