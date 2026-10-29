"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard } from "@/components/ui";
import { DeText } from "@/components/flashcard";
import { supabase } from "@/lib/supabase";
import { play, speak } from "@/lib/audio";
import type { Item } from "@/lib/cards";

export default function AlphabetPage() {
  const { t, settings } = useApp();
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState<Item | null>(null);

  useEffect(() => {
    supabase
      .from("content_items")
      .select("*")
      .eq("lesson_id", "a1-start-alphabet")
      .order("sort")
      .then(({ data }) => setItems((data as Item[]) ?? []));
  }, []);

  if (!items) return <p className="text-violet-200">{t("loading")}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("alphabet")}</h1>
      <p className="text-sm text-violet-200">{t("tapToListen")}</p>
      {!items.length && <GlassCard>{t("noContent")}</GlassCard>}

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => {
              setOpen(it);
              play(it);
            }}
            className={`glass rounded-2xl py-3 text-lg font-semibold ${open?.id === it.id ? "ring-2 ring-violet-300" : ""}`}
            lang="de"
          >
            {it.de.split(" — ")[0]}
          </button>
        ))}
      </div>

      {open && (
        <GlassCard className="space-y-2">
          <div className="text-xl">
            <DeText item={{ de: open.de.split(" — ")[1] ?? open.de, article: open.article }} />
          </div>
          <p className="text-sm text-violet-200">{open[settings.lang]}</p>
          {open.example_de && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <div lang="de">{open.example_de}</div>
                <div className="text-violet-300">{settings.lang === "ru" ? open.example_ru : open.example_uk}</div>
              </div>
              <GlassButton className="shrink-0 px-3 py-2" onClick={() => speak(open.example_de!)} aria-label="Beispiel anhören">
                🔊
              </GlassButton>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
