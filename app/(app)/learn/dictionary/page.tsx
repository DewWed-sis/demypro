"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { DeText } from "@/components/flashcard";
import { GlassButton, GlassCard, GlassInput } from "@/components/ui";
import { aiErrorText, aiJson } from "@/lib/ai/client";
import { deleteWord, myWords, saveWord, searchLocal, type DictEntry, type Item, type Word } from "@/lib/cards";
import { play, speak } from "@/lib/audio";

const Speak = ({ text }: { text: string }) => (
  <button onClick={() => speak(text)} aria-label="Play" className="ml-1 text-violet-200">🔊</button>
);

function EntryView({ e, lang, t, saved, onSave }: { e: DictEntry; lang: "ru" | "uk"; t: ReturnType<typeof useApp>["t"]; saved: boolean; onSave?: () => void }) {
  const de = e.article ? `${e.article} ${e.lemma}` : e.lemma;
  return (
    <GlassCard className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold" lang="de"><DeText item={{ de, article: e.article }} /><Speak text={de} /></p>
          <p className="text-xs text-violet-200">{e.pos} · {e.level}{e.plural && <> · <span lang="de">{e.plural}</span></>}</p>
        </div>
        {onSave && <GlassButton className="shrink-0 px-3 py-2 text-sm" disabled={saved} onClick={onSave}>{saved ? t("dictSaved") : t("dictSave")}</GlassButton>}
      </div>
      <p className="text-lg">{e[lang]}</p>
      {e.forms && <p className="text-sm"><span className="text-violet-200">{t("dictForms")}: </span><span lang="de">{e.forms}</span></p>}
      {e[`grammar_${lang}`] && (
        <div className="rounded-2xl bg-white/5 p-3 text-sm">
          <p className="mb-1 text-violet-200">📐 {t("dictGrammar")}</p>
          <p>{e[`grammar_${lang}`]}</p>
        </div>
      )}
      {e.examples.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-violet-200">{t("dictExamples")}</p>
          {e.examples.map((x) => (
            <div key={x.de}>
              <p lang="de" className="text-lg">{x.de}<Speak text={x.de} /></p>
              <p className="text-sm text-violet-200">{x[lang]}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export default function DictionaryPage() {
  const { t, settings } = useApp();
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<Item[] | null>(null);
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = () => myWords().then(setWords).catch((e: Error) => setError(e.message));
  useEffect(() => {
    reload();
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setError("");
    setEntry(null);
    setLocal(null);
    await Promise.all([
      searchLocal(query).then(setLocal),
      settings.groqKey &&
        aiJson<DictEntry>("/api/ai/dictionary", settings.groqKey, { model: settings.groqModel, query })
          .then(setEntry)
          .catch((err) => setError(aiErrorText(err, t))),
    ]);
    setBusy(false);
  }

  async function save() {
    if (!entry) return;
    try {
      await saveWord(entry);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const savedDe = new Set(words.map((w) => w.de));
  const entryDe = entry && (entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("dictionary")}</h1>
      <form onSubmit={search} className="flex gap-2">
        <GlassInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("dictHint")} aria-label={t("dictHint")} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={80} />
        <GlassButton variant="primary" disabled={busy || !q.trim()}>{busy ? "…" : t("dictSearch")}</GlassButton>
      </form>
      {!settings.groqKey && <Link href="/profile" className="block text-sm text-violet-200 underline">{t("needKey")}</Link>}
      {error && <p className="text-sm text-err">{error}</p>}

      {entry && (entry.found ? (
        <>
          <EntryView e={entry} lang={settings.lang} t={t} saved={savedDe.has(entryDe!)} onSave={save} />
          <p className="text-xs text-violet-200/70">{t("dictAiNote")}</p>
        </>
      ) : (
        <GlassCard className="text-violet-200">{t("dictNotFound")}</GlassCard>
      ))}

      {local && local.length > 0 && (
        <GlassCard className="space-y-2">
          <p className="text-sm text-violet-200">{t("dictInCourse")}</p>
          {local.map((i) => (
            <button key={i.id} onClick={() => play(i)} className="block w-full rounded-2xl px-2 py-1.5 text-left hover:bg-white/10">
              <span lang="de"><DeText item={i} /></span> <span className="text-sm text-violet-200">— {i[settings.lang]}</span>
            </button>
          ))}
        </GlassCard>
      )}

      {words.length > 0 && (
        <GlassCard className="space-y-1 p-3">
          <p className="px-2 pb-1 font-medium">{t("myWords")} · {words.length}</p>
          {words.map((w) => (
            <div key={w.id}>
              <div className="flex items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-white/10">
                <button onClick={() => setOpen(open === w.id ? null : w.id)} className="flex-1 text-left">
                  <span lang="de"><DeText item={w} /></span> <span className="text-sm text-violet-200">— {w[settings.lang]}</span>
                </button>
                <button onClick={() => deleteWord(w.id).then(reload)} aria-label="✕" className="px-2 text-violet-200">✕</button>
              </div>
              {open === w.id && w.data && <EntryView e={w.data} lang={settings.lang} t={t} saved />}
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
