// Сборка вопросов LiD из официальных источников BAMF (только чтение файлов, для npm run seed и тестов).
// Тексты вопросов — PDF Gesamtfragenkatalog (Stand 07.05.2025), варианты и верный ответ — тестцентр oet.bamf.de.
// Переводы и объяснения — content/lid/i18n/*.json (наши, вопросы не меняются).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type LidTopic = "demokratie" | "geschichte" | "recht" | "gesellschaft" | "land";
type Tr = { q_ru: string; q_uk: string; a_ru: string[]; a_uk: string[]; ex_ru: string; ex_uk: string; topic?: LidTopic };

const dir = join(process.cwd(), "content", "lid");
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

// Изображения: {n} в image_url = картинка у каждого варианта ответа.
const images: Record<number, string> = {
  21: "/lid/q21-{n}.webp",
  209: "/lid/q21-{n}.webp",
  301: "/lid/q301-{n}.webp",
  55: "/lid/q55.webp",
  216: "/lid/q216.webp",
  308: "/lid/q308.webp",
};

const rules: [LidTopic, RegExp][] = [
  ["geschichte", /DDR|Mauer|19[0-9]{2}|Nationalsozial|Hitler|Krieg|Weimar|Kaiser|Holocaust|Wiedervereinigung|Stolperstein|Wirtschaftswunder|Israel|jüdisch|Juden|Antisemit|Besatzung|Reich|Montagsdemo|Gastarbeit|Europäische|EU\b|Römische Verträge|Euro\b/i],
  ["gesellschaft", /Kind|Eltern|Familie|Schule|Ehe|heirat|Religion|Kirche|Feiertag|Fest|Versicherung|Arbeit|Verein|Mutter|Frau|Mann|Nachbar|Rente|Ausbildung|Beruf|Weihnachten|Ostern|Pfingsten|Rauchen|Hund|Müll/i],
  ["recht", /Gericht|Gesetz|Recht|Straf|verboten|Anwalt|Polizei|Steuer|Grundgesetz|Verfassung|Freiheit|Menschenwürde|Gleichberechtigung|Diskriminier/i],
];

export function lidRows() {
  const pdf: { n: number; question: string }[] = read("source-pdf-questions.json");
  const oet: Record<string, { correct: number; answers: string[] }> = read("source-oet-answers.json");
  const tr: Record<string, Tr> = {};
  const i18n = join(dir, "i18n");
  if (existsSync(i18n)) for (const f of readdirSync(i18n).filter((f) => f.endsWith(".json"))) Object.assign(tr, read(join("i18n", f)));

  return pdf.map(({ n, question }) => {
    const o = oet[n];
    const t = tr[n];
    const topic: LidTopic = n > 300 ? "land" : (t?.topic ?? rules.find(([, re]) => re.test(question))?.[0] ?? "demokratie");
    return {
      id: n,
      question,
      answers: o.answers,
      correct: o.correct,
      topic,
      bundesland: n > 300 ? "NW" : null,
      image_url: images[n] ?? null,
      question_ru: t?.q_ru ?? null,
      question_uk: t?.q_uk ?? null,
      answers_ru: t?.a_ru ?? null,
      answers_uk: t?.a_uk ?? null,
      explanation_ru: t?.ex_ru ?? null,
      explanation_uk: t?.ex_uk ?? null,
    };
  });
}
