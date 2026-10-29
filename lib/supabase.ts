import { createClient } from "@supabase/supabase-js";

// Браузерный клиент: сессия в localStorage, данные под RLS.
export const supabase = createClient(
  // fallback только чтобы сборка без .env не падала на пререндере
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-anon-key",
  { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true } },
);

export type Profile = {
  id: string;
  display_name: string | null;
  level: "A1" | "A2" | "B1";
  ui_lang: "ru" | "uk";
  daily_minutes: number;
  streak: number;
  last_active_date: string | null;
  reminder_time: string | null;
};
