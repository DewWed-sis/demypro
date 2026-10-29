"use client";

import Link from "next/link";
import { useApp } from "@/components/app-provider";
import type { Key } from "@/lib/i18n";

const parts: { href: string; de: string; key: Key; time: string }[] = [
  { href: "/exam/hoeren", de: "Hören", key: "examHoeren", time: "~25 min" },
  { href: "/exam/lesen", de: "Lesen", key: "examLesen", time: "~45 min" },
  { href: "/exam/schreiben", de: "Schreiben", key: "examSchreiben", time: "30 min" },
  { href: "/exam/sprechen", de: "Sprechen", key: "examSprechen", time: "~16 min" },
  { href: "/exam/mock", de: "Modelltest DTZ", key: "examMock", time: "" },
];

export default function ExamPage() {
  const { t } = useApp();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("exam")}</h1>
      {parts.map((p) => (
        <Link key={p.href} href={p.href} className="glass flex items-center justify-between rounded-3xl p-5 transition hover:bg-white/15">
          <span>
            <span lang="de" className="block font-medium">{p.de}</span>
            <span className="text-sm text-violet-200">{t(p.key)}</span>
          </span>
          <span className="text-sm text-violet-300">{p.time}</span>
        </Link>
      ))}
    </div>
  );
}
