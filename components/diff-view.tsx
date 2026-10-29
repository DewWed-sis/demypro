import type { DiffToken } from "@/lib/diff";

const styles = {
  // shadowing: эталон vs сказанное
  shadow: { ok: "text-ok", miss: "rounded bg-err/20 px-0.5 text-err underline decoration-dotted", extra: "italic text-violet-300" },
  // правка письма: эталон = исправленный текст; miss = добавлено AI, extra = убрано из оригинала
  edit: { ok: "", miss: "rounded bg-ok/20 px-0.5 text-ok", extra: "text-err line-through" },
};

export function DiffView({ tokens, mode = "shadow" }: { tokens: DiffToken[]; mode?: keyof typeof styles }) {
  return (
    <p lang="de" className="leading-relaxed">
      {tokens.map((tk, i) => (
        <span key={i} className={styles[mode][tk.kind]}>
          {tk.word}{" "}
        </span>
      ))}
    </p>
  );
}
