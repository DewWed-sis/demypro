"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard, GlassInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const emailSchema = z.email();

export default function LoginPage() {
  const { t, session } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function run(fn: () => Promise<{ error: { message: string } | null }>, okText?: string) {
    if (!emailSchema.safeParse(email).success) return setMsg({ ok: false, text: "E-mail?" });
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    setMsg(error ? { ok: false, text: /rate limit|too many/i.test(error.message) ? t("emailLimit") : error.message } : okText ? { ok: true, text: okText } : null);
  }

  const signUp = () =>
    run(
      () => supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } }),
      t("checkMailConfirm"),
    );
  const magic = () =>
    run(() => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } }), t("checkMail"));

  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-4">
      <GlassCard className="w-full space-y-5 p-6">
        <div>
          <h1 className="text-3xl font-semibold" lang="de">
            Deutsch <span className="text-violet-300">DTZ</span>
          </h1>
          <p className="text-sm text-violet-200">{t("tagline")}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => supabase.auth.signInWithPassword({ email, password }));
          }}
          className="space-y-3"
        >
          <GlassInput type="email" autoComplete="email" placeholder={t("email")} aria-label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <GlassInput type="password" autoComplete="current-password" placeholder={t("password")} aria-label={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
          <GlassButton variant="primary" className="w-full" disabled={busy || password.length < 6}>
            {t("signIn")}
          </GlassButton>
        </form>
        <div className="grid gap-2">
          <GlassButton type="button" onClick={signUp} disabled={busy || password.length < 6}>
            {t("signUp")}
          </GlassButton>
          <GlassButton type="button" onClick={magic} disabled={busy}>
            ✉︎ {t("magicLink")}
          </GlassButton>
        </div>
        {msg && (
          <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-err"}`}>
            {msg.text}
          </p>
        )}
      </GlassCard>
    </main>
  );
}
