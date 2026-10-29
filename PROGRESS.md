# PROGRESS.md

## Текущее состояние
Этапы 1 и 2 — готовы и проверены в браузере на реальной базе (вход по magic link, план дня, карточки, оценка FSRS, стрик, алфавит).
Этап 3 (LiD) — готов и проверен в браузере.
Дальше: этап 4 (голос). Для проверки AI-функций нужен ключ Groq владельца в Профиле.

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

### Этап 3. Leben in Deutschland
- Официальный каталог BAMF: тексты вопросов — PDF Gesamtfragenkatalog (Stand 07.05.2025, bamf.de); варианты и верные ответы — официальный тестцентр oet.bamf.de (310/310, два прохода совпали). В PDF ключа ответов нет.
- Исходники в `content/lid/source-*.json`, парсер `scripts/lid-parse.py`, сборка `lib/lid-source.ts`.
- Картинки из PDF (гербы, флаги, карты, фото, бюллетени) — `public/lid/*.webp`, 12 вопросов.
- Переводы ru/uk + короткие объяснения ко всем 310 — `content/lid/i18n/*.json` (наш контент, вопросы не меняются).
- Темы: демократия 133 → после ручной разметки, история 85, право, общество, NRW 10.
- Экраны: `/lid` (прогресс по темам), `/lid/practice` (по теме / все / только ошибки, сначала просроченные FSRS), `/lid/test` (30 общих + 3 NRW, 60 мин, пороги 15/17, разбор ошибок, сохранение в mock_exams).
- Каждый ответ: lid_progress + FSRS-карточка (верно → Good, неверно → Again). Блок LiD в плане дня засчитывается после 10 вопросов.
- Тест Vitest: 310 вопросов, NRW 301–310, 4 варианта, переводы согласованы.

## Инфраструктура
- Supabase: проект `deutsch-dtz` (ref gokbwmzuumzhbmffzele, eu-west-2). Миграция и сиды применены через SQL Editor.
- `.env.local`: URL + publishable key (публичные). Service-ключ не используется нигде.

## Дальше
- Этап 4: запись голоса, /api/ai/transcribe (Whisper), shadowing, озвучка браузером

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
- Аудио лежит статикой в `public/audio/<id>.m4a`, а не в Supabase Storage: не нужен service-ключ, файлы кэшируются PWA для офлайна. `audio_url` остаётся для внешних ссылок.
- Сиды: `npm run seed` генерирует `supabase/seed.sql` (идемпотентный upsert), применяется в SQL Editor — без service-ключа.
- Плитки ch: «ich-Laut» / «ach-Laut» вместо двух одинаковых «ch».
- LiD: вопрос показывается по-немецки (как на экзамене), перевод — по кнопке; картинки на белой плашке (силуэты не видны на тёмном фоне).
- Q72/Q73/Q75 (канцлер, фракции, президент) зависят от текущей политики — при обновлении каталога BAMF перезапустить сбор ответов.

## Грабли
- В PDF BAMF нет отметок верных ответов (все маркеры одинаковые) → ответы взяты из oet.bamf.de (там текст вопроса — картинка, ответы — текст).
- Текст PDF грязный: разорванные «Auf\ngabe», выделенные слова с пробелом («nicht i m», «zu r»), новые вопросы с маркером «□» — всё чинится в lid-parse.py.
- Одна картинка в PDF — одноцветный силуэт с маской (хризма), без маски получался чёрный квадрат → берём `img.image` из pypdf.
- Лимит Free Supabase — 2 активных проекта; владелец удалил старый Print_3D.
- Страница Supabase не может fetch с localhost (CSP/Private Network Access) — SQL вставляем через буфер обмена (pbcopy → Cmd+V в Monaco).
- Анализатор SQL Editor не видит `enable row level security` внутри `do $$` и предупреждает — безопасно.
- Next 16 включает cacheComponents по умолчанию: чтение cookies вне Suspense — ошибка сборки. Обошли клиентской авторизацией.
- vitest 5 требует @types/node ≥ 22 — обновили.
- В survival-фразах была ошибка «Kein Ahnung» → исправлено на «Keine Ahnung».

## Блокеры (нужен владелец)
- **GitHub push:** создание приватного репо и `git push` заблокировал классификатор прав Claude Code (не Git). Нужно разрешить в настройках или выполнить `gh repo create deutsch-dtz --private --source=. --remote=origin --push` вручную.
