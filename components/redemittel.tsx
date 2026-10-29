"use client";

import data from "@/content/exam/_redemittel.json";
import { speak } from "@/lib/audio";
import type { Lang } from "@/lib/i18n";

export type RedemittelGroup = keyof typeof data;

/** Банк фраз (Redemittel) для Sprechen/Schreiben: нажатие озвучивает фразу. */
export function Redemittel({ groups, lang, title }: { groups: RedemittelGroup[]; lang: Lang; title: string }) {
  return (
    <details className="glass rounded-3xl p-4">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <ul className="mt-3 space-y-2">
        {groups.flatMap((g) => data[g]).map((p) => (
          <li key={p.de}>
            <button type="button" onClick={() => speak(p.de)} className="w-full rounded-2xl px-2 py-1 text-left hover:bg-white/10">
              <span lang="de" className="block">{p.de}</span>
              <span className="text-sm text-violet-300">{p[lang]}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
