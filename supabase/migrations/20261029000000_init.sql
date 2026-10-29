-- Deutsch A1→B1: схема, RLS, триггер профиля.
-- Контент: читают авторизованные, пишет только service role (npm run seed).
-- Личное: RLS user_id = auth.uid().

-- ───────────── Контент ─────────────

create table public.levels (
  id text primary key check (id in ('A1', 'A2', 'B1')),
  title text not null,
  target_words int not null,
  sort int not null
);

create table public.topics (
  id text primary key,               -- 'familie', 'wohnen', ...
  title_de text not null,
  title_ru text not null,
  title_uk text not null,
  sort int not null
);

create table public.lessons (
  id text primary key,               -- 'A1-familie-1'
  level_id text not null references public.levels,
  topic_id text references public.topics,
  kind text not null default 'vocab' check (kind in ('vocab', 'grammar', 'start', 'exam')),
  title_ru text not null,
  title_uk text not null,
  sort int not null default 0
);

create table public.content_items (
  id text primary key,               -- стабильный slug для идемпотентных сидов
  level_id text not null references public.levels,
  topic_id text references public.topics,
  lesson_id text references public.lessons,
  kind text not null default 'phrase' check (kind in ('phrase', 'word', 'letter', 'number')),
  de text not null,
  ru text not null,
  uk text not null,
  cloze text,                        -- фраза с ___ вместо ключевого слова
  example_de text,
  example_ru text,
  example_uk text,
  article text check (article in ('der', 'die', 'das')),
  plural text,
  audio_url text,
  tags text[] not null default '{}',
  sort int not null default 0
);
create index on public.content_items (level_id, topic_id);

create table public.grammar_points (
  id text primary key,
  level_id text not null references public.levels,
  title_ru text not null,
  title_uk text not null,
  rule_ru text not null,
  rule_uk text not null,
  examples jsonb not null default '[]',   -- [{de, ru, uk}]
  quiz jsonb not null default '[]',       -- [{q, options, answer}]
  error_types text[] not null default '{}',
  sort int not null default 0
);

create table public.exam_tasks (
  id text primary key,
  part text not null check (part in ('hoeren', 'lesen', 'schreiben', 'sprechen')),
  teil int not null,
  type text not null,
  level_id text references public.levels,
  topic_id text references public.topics,
  instructions jsonb not null default '{}', -- {de, ru, uk}
  text text,
  audio_url text,
  options jsonb not null default '[]',
  answers jsonb not null default '[]',
  meta jsonb not null default '{}',
  time_limit_sec int
);
create index on public.exam_tasks (part, teil);

create table public.lid_questions (
  id int primary key,                -- номер в официальном каталоге BAMF
  question text not null,
  answers jsonb not null,            -- 4 строки
  correct smallint not null check (correct between 0 and 3),
  topic text not null,               -- demokratie | geschichte | recht | gesellschaft | land
  bundesland text,                   -- null = общий вопрос, 'NW' = NRW
  image_url text,
  question_ru text,
  question_uk text,
  answers_ru jsonb,
  answers_uk jsonb,
  explanation_ru text,
  explanation_uk text
);

-- ───────────── Личное ─────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  level text not null default 'A1' references public.levels,
  ui_lang text not null default 'ru' check (ui_lang in ('ru', 'uk')),
  daily_minutes int not null default 35 check (daily_minutes between 10 and 120),
  streak int not null default 0,
  last_active_date date,
  reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item_type text not null check (item_type in ('content', 'lid', 'error', 'grammar')),
  item_id text not null,
  fsrs jsonb not null,               -- состояние ts-fsrs Card
  due timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);
create index on public.user_cards (user_id, due);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  card_id uuid not null references public.user_cards on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  log jsonb,
  reviewed_at timestamptz not null default now()
);
create index on public.reviews (user_id, reviewed_at);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('writing', 'speaking')),
  exam_task_id text references public.exam_tasks,
  part text,
  prompt jsonb,
  text text,
  transcript text,
  scores jsonb,
  level_estimate text,
  feedback jsonb,
  created_at timestamptz not null default now()
);
create index on public.attempts (user_id, created_at desc);

create table public.error_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,                -- word_order_v2, verb_final, article_gender, ...
  example text not null,
  correction text not null,
  rule_ru text,
  rule_uk text,
  count int not null default 1,
  attempt_id uuid references public.attempts on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index on public.error_log (user_id, type);

create table public.lid_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  question_id int not null references public.lid_questions,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  last_correct boolean,
  last_seen timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('dtz', 'lid')),
  scores jsonb not null default '{}',   -- {hoeren, lesen, schreiben, sprechen} или {correct, total}
  passed boolean,
  taken_at timestamptz not null default now()
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  blocks jsonb not null default '[]',   -- [{kind, minutes, done}]
  completed boolean not null default false,
  minutes_done int not null default 0,
  unique (user_id, date)
);

-- ───────────── RLS ─────────────

do $$
declare t text;
begin
  foreach t in array array['levels','topics','lessons','content_items','grammar_points','exam_tasks','lid_questions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read for authenticated" on public.%I for select to authenticated using (true)', t);
  end loop;

  foreach t in array array['user_cards','reviews','attempts','error_log','lid_progress','mock_exams','daily_plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ───────────── Триггеры ─────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────── Базовые данные ─────────────

insert into public.levels (id, title, target_words, sort) values
  ('A1', 'A1 Start', 650, 1), ('A2', 'A2', 1300, 2), ('B1', 'B1 DTZ', 2400, 3);

insert into public.topics (id, title_de, title_ru, title_uk, sort) values
  ('kennenlernen', 'Sich vorstellen', 'Знакомство', 'Знайомство', 1),
  ('familie', 'Familie', 'Семья', 'Сім''я', 2),
  ('wohnen', 'Wohnen', 'Жильё', 'Житло', 3),
  ('arbeit', 'Arbeit', 'Работа', 'Робота', 4),
  ('gesundheit', 'Beim Arzt', 'Врач и здоровье', 'Лікар і здоров''я', 5),
  ('einkaufen', 'Einkaufen', 'Покупки', 'Покупки', 6),
  ('aemter', 'Ämter und Behörden', 'Ведомства', 'Установи', 7),
  ('verkehr', 'Verkehr', 'Транспорт', 'Транспорт', 8),
  ('freizeit', 'Freizeit', 'Свободное время', 'Вільний час', 9),
  ('schule', 'Schule und Kinder', 'Школа и дети', 'Школа і діти', 10),
  ('medien', 'Medien', 'СМИ', 'ЗМІ', 11),
  ('deutschland', 'Deutschland und Kultur', 'Германия и культура', 'Німеччина і культура', 12);

-- Аудио: публичное чтение, запись только service role
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
  on conflict (id) do nothing;
