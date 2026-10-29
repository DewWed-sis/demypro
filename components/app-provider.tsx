"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { MotionConfig } from "motion/react";
import { supabase, type Profile } from "@/lib/supabase";
import { t as tr, type Key, type Lang } from "@/lib/i18n";

// Только на устройстве (localStorage): ключ Groq, модель, упрощённый режим.
export type LocalSettings = { groqKey: string; groqModel: string; simple: boolean; lang: Lang };
const LS_KEY = "dtz-settings";
const defaults: LocalSettings = { groqKey: "", groqModel: "llama-3.3-70b-versatile", simple: false, lang: "ru" };

function readLocal(): LocalSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") };
  } catch {
    return defaults;
  }
}

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  settings: LocalSettings;
  setSettings: (patch: Partial<LocalSettings>) => void;
  updateProfile: (patch: Partial<Profile>) => Promise<string | null>;
  t: (k: Key) => string;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setLocal] = useState<LocalSettings>(defaults);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage доступен только на клиенте
    setLocal(readLocal());
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setProfile(data as Profile);
        setLocal((s) => ({ ...s, lang: (data as Profile).ui_lang }));
      });
  }, [userId]);

  useEffect(() => {
    document.documentElement.classList.toggle("simple", settings.simple);
    document.documentElement.lang = settings.lang;
  }, [settings.simple, settings.lang]);

  const setSettings = useCallback((patch: Partial<LocalSettings>) => {
    setLocal((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!userId) return "no session";
      const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
      if (error) return error.message;
      setProfile(data as Profile);
      return null;
    },
    [userId],
  );

  const t = useCallback((k: Key) => tr(k, settings.lang), [settings.lang]);

  return (
    <AppCtx value={{ ready, session, profile, settings, setSettings, updateProfile, t }}>
      <MotionConfig reducedMotion={settings.simple ? "always" : "user"}>{children}</MotionConfig>
    </AppCtx>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
