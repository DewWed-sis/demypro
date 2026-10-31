import type { Item } from "./cards";
import { clozeAnswer } from "./readiness";
import pictures from "../content/games/pictures.json";

// Мини-игры: урок из ~12 заданий разных типов, собранный из фраз курса, личного словаря и картинок.
export type GameItem = Item & { emoji?: string; src?: "content" | "word" | "picture" };
type Article = "der" | "die" | "das";

export type Task =
  | { kind: "choose"; item: GameItem; toDe: boolean; options: GameItem[] } // перевод в одну из сторон
  | { kind: "listen"; item: GameItem; options: GameItem[] } // слушаешь — выбираешь, что прозвучало
  | { kind: "picture"; item: GameItem; options: GameItem[] } // эмодзи → слово с артиклем
  | { kind: "article"; item: GameItem; noun: string; article: Article }
  | { kind: "build"; item: GameItem; tiles: string[] } // собрать фразу из плиток (V2, глагол в конце)
  | { kind: "cloze"; item: GameItem; answer: string; options: string[] }
  | { kind: "pairs"; items: GameItem[] };

export const pictureItems: GameItem[] = pictures.map((p) => ({
  id: `pic-${p.de}`, kind: "word", de: `${p.article} ${p.de}`, ru: p.ru, uk: p.uk, cloze: null,
  example_de: null, example_ru: null, example_uk: null, article: p.article as Article,
  plural: p.plural && `die ${p.plural}`, audio_url: null, lesson_id: null, emoji: p.emoji, src: "picture",
}));

export function shuffle<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const words = (s: string) => s.trim().split(/\s+/);
/** Сравнение без регистра и знаков препинания: «Ich wohne in Köln.» = «ich wohne in köln». */
export const same = (a: string, b: string) => {
  const n = (s: string) => s.toLowerCase().replace(/[.,!?;:«»"„“]/g, "").replace(/ß/g, "ss").replace(/\s+/g, " ").trim();
  return n(a) === n(b);
};

const ARTICLE_RE = /^(der|die|das) (\S.*)$/;

function others(pool: GameItem[], item: GameItem, n: number) {
  return shuffle(pool.filter((o) => o.de !== item.de && o.ru !== item.ru)).slice(0, n);
}

const ORDER = ["picture", "choose", "build", "listen", "article", "cloze", "choose", "pairs", "build", "picture", "listen", "choose"] as const;

export function buildLesson(pool: GameItem[], n = 12): Task[] {
  const used = new Set<string>();
  const short = pool.filter((i) => i.de.length <= 60 && !i.de.includes("…"));
  const take = (list: GameItem[]) => {
    const it = shuffle(list).find((i) => !used.has(i.id)) ?? list[0];
    if (it) used.add(it.id);
    return it;
  };
  const make = (kind: (typeof ORDER)[number]): Task | null => {
    if (kind === "picture") {
      const item = take(pictureItems);
      return { kind, item, options: shuffle([item, ...others(pictureItems, item, 3)]) };
    }
    if (kind === "article") {
      const nouns = [...pictureItems, ...pool.filter((i) => i.article && ARTICLE_RE.test(i.de))];
      const item = take(nouns);
      const [, article, noun] = item.de.match(ARTICLE_RE)!;
      return { kind, item, noun, article: article as Article };
    }
    if (kind === "build") {
      const list = short.filter((i) => i.kind === "phrase" && words(i.de).length >= 3 && words(i.de).length <= 9);
      if (!list.length) return null;
      const item = take(list);
      const own = words(item.de);
      const extra = shuffle(list.filter((o) => o !== item).flatMap((o) => words(o.de)).filter((w) => !own.includes(w))).slice(0, 2);
      return { kind, item, tiles: shuffle([...own, ...extra]) };
    }
    if (kind === "cloze") {
      const list = short.filter((i) => i.cloze?.includes("___"));
      if (list.length < 4) return null;
      const item = take(list);
      const answer = clozeAnswer(item.de, item.cloze!);
      const wrong = [...new Set(list.map((o) => clozeAnswer(o.de, o.cloze!)))].filter((a) => !same(a, answer));
      return { kind, item, answer, options: shuffle([answer, ...shuffle(wrong).slice(0, 3)]) };
    }
    if (kind === "pairs") {
      const list = shuffle(short.filter((i) => i.de.length <= 30 && !used.has(i.id)));
      const items: GameItem[] = [];
      for (const i of list) if (items.length < 5 && !items.some((o) => o.ru === i.ru)) items.push(i);
      if (items.length < 4) return null;
      items.forEach((i) => used.add(i.id));
      return { kind, items };
    }
    if (short.length < 4) return null;
    const item = take(short);
    const options = shuffle([item, ...others(short, item, 3)]);
    return kind === "listen" ? { kind, item, options } : { kind: "choose", item, toDe: Math.random() < 0.5, options };
  };
  return ORDER.slice(0, n).flatMap((k) => make(k) ?? make("choose") ?? make("picture") ?? []);
}
