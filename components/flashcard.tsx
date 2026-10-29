"use client";

import { motion } from "motion/react";
import type { Item } from "@/lib/cards";
import type { Lang } from "@/lib/i18n";
import { play } from "@/lib/audio";

const articleColor = { der: "text-der", die: "text-die", das: "text-das" } as const;

/** Немецкий текст с цветным артиклем: der синий, die красный, das зелёный. */
export function DeText({ item }: { item: Pick<Item, "de" | "article"> }) {
  const a = item.article;
  if (a && item.de.startsWith(`${a} `)) {
    return (
      <span lang="de">
        <b className={articleColor[a]}>{a}</b>
        {item.de.slice(a.length)}
      </span>
    );
  }
  return <span lang="de">{item.de}</span>;
}

/** Переворачиваемая карточка: спереди родной язык + пропуск, сзади немецкий с аудио. */
export function Flashcard({
  item,
  lang,
  flipped,
  onFlip,
  prompt,
}: {
  item: Item;
  lang: Lang;
  flipped: boolean;
  onFlip: () => void;
  prompt: string;
}) {
  const native = item[lang];
  const example = lang === "ru" ? item.example_ru : item.example_uk;
  return (
    <div className="[perspective:1200px]">
      <motion.div
        className="relative min-h-72 [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <button
          type="button"
          onClick={onFlip}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
          className="glass absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center [backface-visibility:hidden]"
        >
          <span className="text-xs uppercase tracking-wide text-violet-300">{prompt}</span>
          <span className="text-2xl font-medium">{native}</span>
          {item.cloze && (
            <span lang="de" className="text-lg text-violet-200">
              {item.cloze}
            </span>
          )}
        </button>

        <div
          aria-hidden={!flipped}
          className="glass absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div className="text-2xl font-semibold">
            <DeText item={item} />
          </div>
          {item.plural && (
            <div lang="de" className="text-sm text-violet-200">
              Pl.: {item.plural}
            </div>
          )}
          <div className="text-sm text-violet-200">{native}</div>
          {item.example_de && (
            <div className="mt-2 space-y-0.5 text-sm">
              <div lang="de">{item.example_de}</div>
              {example && <div className="text-violet-300">{example}</div>}
            </div>
          )}
          <button
            type="button"
            onClick={() => play(item)}
            tabIndex={flipped ? 0 : -1}
            className="glass mt-2 rounded-2xl px-4 py-2 text-sm"
            aria-label="Anhören"
          >
            🔊 Anhören
          </button>
        </div>
      </motion.div>
    </div>
  );
}
