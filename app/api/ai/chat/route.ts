import { badInput, GROQ_BASE, groqHeaders, groqKey, noKey, upstreamError } from "@/lib/ai/groq";
import { examinerPrompt, hintPrompt } from "@/lib/ai/prompts";
import { chatInput } from "@/lib/ai/schemas";

// Экзаменатор/партнёр Sprechen: стрим ответа Groq как обычный текст.
export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();
  const input = chatInput.safeParse(await req.json().catch(() => null));
  if (!input.success) return badInput();
  const { model, level, part, task, messages, hint } = input.data;

  const system = examinerPrompt(part, level, task) + (hint ? `\n\n${hintPrompt(hint)}` : "");
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: groqHeaders(key),
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      max_tokens: hint ? 250 : 160,
      messages: [{ role: "system", content: system }, ...(messages.length ? messages : [{ role: "user", content: "(Prüfung beginnt)" }])],
    }),
  });
  if (!res.ok || !res.body) return upstreamError(res);

  // SSE "data: {...choices[0].delta.content}" → чистый текст
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";
  const stream = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.replace(/^data: /, "").trim();
          if (!data || data === "[DONE]" || !line.startsWith("data: ")) continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) ctrl.enqueue(encoder.encode(delta));
          } catch {}
        }
      },
    }),
  );
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
