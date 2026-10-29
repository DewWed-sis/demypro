"use client";

import type { Key } from "@/lib/i18n";

// Клиентский вызов AI-роутов: ключ из localStorage в заголовке x-groq-key,
// при 429 ждём столько, сколько сказал Groq (Retry-After), и повторяем.
export class AiError extends Error {
  constructor(
    public code: "no_key" | "bad_key" | "rate_limit" | "bad_input" | "upstream" | "network",
    public detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function aiFetch(path: string, key: string, body: BodyInit | object, tries = 3): Promise<Response> {
  if (!key) throw new AiError("no_key");
  const isForm = body instanceof FormData;
  for (let i = 0; ; i++) {
    let res: Response;
    try {
      res = await fetch(path, {
        method: "POST",
        headers: { "x-groq-key": key, ...(isForm ? {} : { "Content-Type": "application/json" }) },
        body: isForm ? body : JSON.stringify(body),
      });
    } catch {
      throw new AiError("network");
    }
    if (res.ok) return res;
    if (res.status === 429 && i < tries - 1) {
      await sleep(Math.min(30, Number(res.headers.get("retry-after")) || 5) * 1000);
      continue;
    }
    const { error, detail } = (await res.json().catch(() => ({}))) as { error?: AiError["code"]; detail?: string };
    throw new AiError(error ?? "upstream", detail);
  }
}

export async function transcribe(blob: Blob, key: string) {
  const form = new FormData();
  form.append("file", blob, blob.type.includes("mp4") || blob.type.includes("aac") ? "rec.m4a" : "rec.webm");
  const res = await aiFetch("/api/ai/transcribe", key, form);
  return ((await res.json()) as { text: string }).text;
}

const errKey: Record<AiError["code"], Key> = {
  no_key: "needKey",
  bad_key: "aiBadKey",
  rate_limit: "aiRateLimit",
  network: "aiNetwork",
  bad_input: "aiUpstream",
  upstream: "aiUpstream",
};
export const aiErrorKey = (e: unknown): Key => (e instanceof AiError ? errKey[e.code] : "aiUpstream");

/** Стрим ответа экзаменатора: onDelta получает накопленный текст. */
export async function chatStream(body: object, key: string, onDelta: (text: string) => void) {
  const res = await aiFetch("/api/ai/chat", key, body);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onDelta(text);
  }
  return text.trim();
}

export async function aiJson<T>(path: string, key: string, body: object): Promise<T> {
  return (await aiFetch(path, key, body)).json() as Promise<T>;
}

/** Текст ошибки для экрана: понятная фраза + причина от Groq, если есть. */
export const aiErrorText = (e: unknown, t: (k: Key) => string) =>
  t(aiErrorKey(e)) + (e instanceof AiError && e.detail ? ` (${e.detail})` : "");
