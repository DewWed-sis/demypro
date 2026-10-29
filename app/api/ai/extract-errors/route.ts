import { chatJson } from "@/lib/ai/json";
import { badInput, groqKey, noKey } from "@/lib/ai/groq";
import { extractErrorsPrompt } from "@/lib/ai/prompts";
import { extractedErrors, extractInput } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();
  const input = extractInput.safeParse(await req.json().catch(() => null));
  if (!input.success) return badInput();
  const { model, text, corrections } = input.data;
  const user = `Text:\n${text}\n\nKorrekturen:\n${corrections.map((c) => `${c.original} → ${c.fixed}`).join("\n") || "—"}`;
  const r = await chatJson(key, model, extractErrorsPrompt(), user, extractedErrors);
  return r.error ?? Response.json(r.data);
}
