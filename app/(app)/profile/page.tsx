"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard, GlassInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/lib/i18n";

export default function ProfilePage() {
  const { t, session, profile, settings, setSettings, updateProfile } = useApp();
  const [key, setKey] = useState(settings.groqKey);
  const [models, setModels] = useState<string[]>([]);
  const [keyStatus, setKeyStatus] = useState<"" | "checking" | "ok" | "bad">("");
  const [minutesDraft, setMinutes] = useState<number | null>(null);
  const minutes = minutesDraft ?? profile?.daily_minutes ?? 35;
  const [msg, setMsg] = useState("");

  async function setLang(lang: Lang) {
    setSettings({ lang });
    await updateProfile({ ui_lang: lang });
  }

  async function checkKey() {
    setKeyStatus("checking");
    setSettings({ groqKey: key.trim() });
    try {
      const res = await fetch("/api/ai/ping", { method: "POST", headers: { "x-groq-key": key.trim() } });
      const body = (await res.json()) as { ok?: boolean; models?: string[] };
      setKeyStatus(body.ok ? "ok" : "bad");
      if (body.models) setModels(body.models);
    } catch {
      setKeyStatus("bad");
    }
  }

  async function saveGoal() {
    const err = await updateProfile({ daily_minutes: minutes });
    setMsg(err ? `${t("error")}: ${err}` : t("saved"));
  }

  const modelOptions = models.length ? models : [settings.groqModel];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("profile")}</h1>

      <GlassCard className="space-y-1">
        <div className="font-medium">{profile?.display_name}</div>
        <div className="text-sm text-violet-200">{session?.user.email}</div>
      </GlassCard>

      <GlassCard className="space-y-5">
        <h2 className="font-medium">{t("settings")}</h2>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm text-violet-200">{t("uiLang")}</legend>
          <div className="flex gap-2">
            {(["ru", "uk"] as const).map((l) => (
              <GlassButton
                key={l}
                variant={settings.lang === l ? "primary" : "ghost"}
                aria-pressed={settings.lang === l}
                onClick={() => setLang(l)}
              >
                {l === "ru" ? "Русский" : "Українська"}
              </GlassButton>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="minutes" className="text-sm text-violet-200">
            {t("dailyGoal")}: <b className="text-white">{minutes}</b>
          </label>
          <input
            id="minutes"
            type="range"
            min={10}
            max={90}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(+e.target.value)}
            className="w-full accent-violet-400"
          />
          <GlassButton onClick={saveGoal}>{t("save")}</GlassButton>
          {msg && <span className="ml-3 text-sm text-violet-200">{msg}</span>}
        </div>

        <div className="space-y-2">
          <label htmlFor="groq" className="text-sm text-violet-200">
            {t("groqKey")}
          </label>
          <GlassInput
            id="groq"
            type="password"
            autoComplete="off"
            placeholder="gsk_…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <p className="text-xs text-violet-300">{t("groqKeyHint")}</p>
          <div className="flex items-center gap-3">
            <GlassButton onClick={checkKey} disabled={!key.trim() || keyStatus === "checking"}>
              {t("checkKey")}
            </GlassButton>
            <span role="status" className="text-sm">
              {keyStatus === "ok" && <span className="text-ok">✓ {t("keyOk")}</span>}
              {keyStatus === "bad" && <span className="text-err">✕ {t("keyBad")}</span>}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="model" className="text-sm text-violet-200">
            {t("model")}
          </label>
          <select
            id="model"
            value={settings.groqModel}
            onChange={(e) => setSettings({ groqModel: e.target.value })}
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 [&>option]:bg-[#1e1450]"
          >
            {modelOptions.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.simple}
            onChange={(e) => setSettings({ simple: e.target.checked })}
            className="size-5 accent-violet-400"
          />
          {t("simpleMode")}
        </label>
      </GlassCard>

      <GlassButton className="w-full" onClick={() => supabase.auth.signOut()}>
        {t("signOut")}
      </GlassButton>
    </div>
  );
}
