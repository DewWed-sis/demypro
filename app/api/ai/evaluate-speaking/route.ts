import { chatJson } from "@/lib/ai/json";
import { badInput, groqKey, noKey } from "@/lib/ai/groq";
import { speakingEvalPrompt } from "@/lib/ai/prompts";
import { speakingEvaluation, speakingInput } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();
  const input = speakingInput.safeParse(await req.json().catch(() => null));
  if (!input.success) return badInput();
  const { model, level, part, task, transcript } = input.data;
  const r = await chatJson(key, model, speakingEvalPrompt(part, level), `Aufgabe: ${task}\n\nTranskript:\n${transcript}`, speakingEvaluation);
  return r.error ?? Response.json(r.data);
}
