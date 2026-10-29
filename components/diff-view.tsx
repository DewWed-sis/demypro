import type { DiffToken } from "@/lib/diff";

/** Подсветка расхождений: зелёный — совпало, коралловый зачёркнутый — пропущено, курсив — лишнее. */
export function DiffView({ tokens }: { tokens: DiffToken[] }) {
  return (
    <p lang="de" className="leading-relaxed">
      {tokens.map((tk, i) => (
        <span
          key={i}
          className={
            tk.kind === "ok"
              ? "text-ok"
              : tk.kind === "miss"
                ? "rounded bg-err/20 px-0.5 text-err underline decoration-dotted"
                : "italic text-violet-300"
          }
        >
          {tk.word}{" "}
        </span>
      ))}
    </p>
  );
}
