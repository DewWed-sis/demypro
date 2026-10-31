-- Личный словарь: слова, найденные пользователем, становятся его карточками FSRS (user_cards.item_type = 'word').
create table public.user_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  de text not null,
  ru text not null default '',
  uk text not null default '',
  article text check (article in ('der', 'die', 'das')),
  plural text,
  example_de text,
  example_ru text,
  example_uk text,
  data jsonb,                        -- полный разбор AI (формы, грамматика, примеры)
  created_at timestamptz not null default now(),
  unique (user_id, de)
);
alter table public.user_words enable row level security;
create policy "own rows" on public.user_words for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.user_cards drop constraint user_cards_item_type_check;
alter table public.user_cards add constraint user_cards_item_type_check
  check (item_type in ('content', 'lid', 'error', 'grammar', 'word'));
