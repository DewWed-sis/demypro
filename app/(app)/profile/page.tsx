"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { GlassButton, GlassCard, GlassInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/lib/i18n";

// Ежедневное напоминание файлом .ics: работает в календаре iPhone/Mac/Android без push-сервера.
function downloadIcs(time: string) {
  const [h, m] = time.split(":");
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deutsch DTZ//RU",
    "BEGIN:VEVENT",
    `UID:dtz-daily-${day}@deutsch-dtz`,
    `DTSTAMP:${day}T000000Z`,
    `DTSTART:${day}T${h}${m}00`,
    "DURATION:PT35M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:Deutsch: план дня 🇩🇪",
    `URL:${location.origin}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Время немецкого!",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "deutsch-dtz.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ProfilePage() {
  const { t, session, profile, settings, setSettings, updateProfile } = useApp();
  const [key, setKey] = useState(settings.groqKey);
  const [models, setModels] = useState<string[]>([]);
  const [keyStatus, setKeyStatus] = useState<"" | "checking" | "ok" | "bad">("");
  const [minutesDraft, setMinutes] = useState<number | null>(null);
  const minutes = minutesDraft ?? profile?.daily_minutes ?? 35;
  const [msg, setMsg] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  async function savePassword() {
    if (pwd.length < 8) return setPwdMsg(t("passwordShort"));
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdMsg(error ? `${t("error")}: ${error.message}` : t("passwordSaved"));
    if (!error) setPwd("");
  }
  const [reminderDraft, setReminder] = useState<string | null>(null);
  const reminder = reminderDraft ?? profile?.reminder_time?.slice(0, 5) ?? "19:00";

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
            {t("dailyGoal")}: <b className="text-violet-50">{minutes}</b>
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
          <label htmlFor="pwd" className="text-sm text-violet-200">{t("setPassword")}</label>
          <div className="flex gap-2">
            <GlassInput id="pwd" type="text" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <GlassButton onClick={savePassword} disabled={!pwd}>{t("save")}</GlassButton>
          </div>
          <p className="text-xs text-violet-300">{pwdMsg || t("setPasswordHint")}</p>
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
            checked={settings.theme === "light"}
            onChange={(e) => setSettings({ theme: e.target.checked ? "light" : "dark" })}
            className="size-5 accent-violet-400"
          />
          {t("lightTheme")}
        </label>

        <div className="space-y-2">
          <label htmlFor="reminder" className="text-sm text-violet-200">{t("reminder")}</label>
          <div className="flex gap-2">
            <GlassInput
              id="reminder"
              type="time"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              onBlur={() => reminder && updateProfile({ reminder_time: reminder })}
              className="w-36"
            />
            <GlassButton onClick={() => downloadIcs(reminder)} disabled={!reminder} className="text-sm">
              📅 {t("addToCalendar")}
            </GlassButton>
          </div>
          <p className="text-xs text-violet-300">{t("reminderHint")}</p>
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
