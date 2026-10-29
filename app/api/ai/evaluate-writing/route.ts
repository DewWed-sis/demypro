import { chatJson } from "@/lib/ai/json";
import { badInput, groqKey, noKey } from "@/lib/ai/groq";
import { writingEvalPrompt } from "@/lib/ai/prompts";
import { evaluation, writingInput } from "@/lib/ai/schemas";

export async function POST(req: Request) {
  const key = groqKey(req);
  if (!key) return noKey();
  const input = writingInput.safeParse(await req.json().catch(() => null));
  if (!input.success) return badInput();
  const { model, level, task, points, text } = input.data;
  const user = `Aufgabe: ${task}\nPunkte:\n${points.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nText:\n${text}`;
  const r = await chatJson(key, model, writingEvalPrompt(level), user, evaluation);
  return r.error ?? Response.json(r.data);
}
