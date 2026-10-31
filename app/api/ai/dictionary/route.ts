import { chatJson } from "@/lib/ai/json";
import { badInput, groqKey, noKey } from "@/lib/ai/groq";
import { dictionaryPrompt } from "@/lib/ai/prompts";
import { dictionaryEntry, dictionaryInput } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();
  const input = dictionaryInput.safeParse(await req.json().catch(() => null));
  if (!input.success) return badInput();
  const r = await chatJson(key, input.data.model, dictionaryPrompt(), input.data.query, dictionaryEntry);
  return r.error ?? Response.json(r.data);
}
