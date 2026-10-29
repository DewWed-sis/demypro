-- Hören/Lesen тоже сохраняются как попытки (для шкалы готовности).
alter table public.attempts drop constraint if exists attempts_kind_check;
alter table public.attempts add constraint attempts_kind_check check (kind in ('writing', 'speaking', 'hoeren', 'lesen'));
