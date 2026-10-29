# PROGRESS.md

## Текущее состояние
Этапы 1 и 2 — код готов, build/lint/test зелёные, закоммичено локально.
Не проверено в браузере с данными: нет базы Supabase (см. Блокеры).

## Сделано
### Этап 1. Каркас
- Next.js 16.4 (App Router, TS strict, cacheComponents), Tailwind 4, Motion (бывш. Framer Motion), Zod
- Дизайн «жидкое стекло»: aurora-фон, `glass`-утилита, GlassCard/Button/Input/Nav, ProgressRing, ReadinessBar; упрощённый режим, prefers-reduced-motion
- Auth: email+пароль, регистрация, magic link (supabase-js, PKCE, сессия в localStorage)
- Миграция `supabase/migrations/20261029000000_init.sql`: все таблицы, RLS, триггер profiles, уровни и 12 тем, bucket `audio`
- Профиль: язык ru/uk, цель минут, ключ Groq (localStorage) + «Проверить ключ» → `/api/ai/ping` (заодно отдаёт список моделей), выбор модели
- Скелеты экранов: Сегодня, Учить, Экзамен, LiD, Профиль; CSP и security-заголовки; `.env.example`

### Этап 2. Карточки и старт A1
- `lib/srs.ts` — ts-fsrs (FSRS-6), состояние в `user_cards.fsrs` (JSON)
- `lib/plan.ts` — план дня 10/10/10/7.5 под цель минут, чередование письмо/LiD, стрик
- Экран карточек `/learn/cards` (переворот, Again/Hard/Good/Easy с интервалами, Again возвращает карту в сессию)
- Алфавит и произношение `/learn/alphabet` (ä ö ü ß ch sch st/sp ei ie eu -er)
- Контент A1: 306 фраз/слов + 37 букв/сочетаний в `content/a1/*.json` (survival 100, числа/время 24, 12 тем по 14–16)
- `npm run seed` (upsert, не затирает audio_url), `npm run tts` (Piper thorsten через uvx → AAC через afconvert → Storage)
- Аудио: Piper-файл, иначе speechSynthesis с лучшим немецким голосом
- Главный экран: кольцо прогресса дня, блоки плана, «Начать сессию» ведёт в первый невыполненный блок
- Vitest: FSRS, план, стрик, валидация всех сидов (7 тестов)

## Дальше
1. Создать проект Supabase → `.env.local` → применить миграцию → `npm run seed` → `npm run tts`
2. Проверить в браузере этапы 1–2 на реальных данных
3. Этап 3: LiD (официальный каталог BAMF)

## Решения
- Docker нет → локального Supabase нет, только облачный проект.
- Supabase CLI и Vercel CLI — через `npx`, без глобальной установки.
- Все страницы — клиентские, данные через supabase-js прямо из браузера (RLS). Сессия в localStorage, без cookies/proxy. Плюсы: статичные страницы с cacheComponents, проще офлайн-PWA.
- CSP без nonce (вариант «Without Nonces» из доков Next): `script-src 'self' 'unsafe-inline'`, сторонних скриптов нет. Nonce потребовал бы динамический рендер всех страниц.
- Motion (`motion/react`) — актуальное имя Framer Motion.
- Карточки: спереди перевод + пропуск (cloze), сзади немецкий с цветным артиклем, аудио играет при перевороте.
- Новые карточки берутся по порядку курса (`sort`), алфавит в FSRS не попадает.
- Блоки speak/write/lid в плане видны, но помечены «скоро» до этапов 3–6.
- Аудио: AAC/m4a 48 кбит/с (~14 КБ на фразу) вместо WAV.

## Грабли
- Next 16 включает cacheComponents по умолчанию: чтение cookies вне Suspense — ошибка сборки. Обошли клиентской авторизацией.
- vitest 5 требует @types/node ≥ 22 — обновили.
- В survival-фразах была ошибка «Kein Ahnung» → исправлено на «Keine Ahnung».

## Блокеры (нужен владелец)
- **Supabase:** на аккаунте уже 2 активных бесплатных проекта (fin, Print_3D) — это лимит Free. Новый проект не создаётся.
- **GitHub push:** создание приватного репо и `git push` заблокировал классификатор прав Claude Code (не Git). Нужно разрешить в настройках или выполнить `gh repo create deutsch-dtz --private --source=. --remote=origin --push` вручную.
