# Deutsch DTZ — немецкий с нуля до B1

PWA для подготовки к **DTZ** (Deutsch-Test für Zuwanderer) и тесту **Leben in Deutschland**. Объяснения на русском и украинском.

Сайт: https://www.print-3d-ten.site (также https://demypro.vercel.app)

## Что внутри

- **План дня** собирается сам: повторение FSRS → новые фразы → говорение → письмо или LiD.
- **Карточки**: 728 фраз A1–B1 по 12 темам DTZ, с переводом ru/uk, пропусками и озвучкой Piper; цветные артикли der/die/das.
- **Sprechen**: AI-экзаменатор для трёх частей DTZ (Whisper → LLM → голос браузера), оценка по критериям, shadowing с подсветкой расхождений.
- **Schreiben**: выбор темы из двух, 4 пункта, шаблон, таймер 30 мин, AI-проверка с исправленной версией и правилами, банк клише.
- **Hören / Lesen**: 2 полных варианта в формате g.a.s.t. (20 + 25 заданий), таймеры, тренинг ловушек, диалоги разными голосами.
- **LiD**: официальный каталог BAMF (300 + 10 NRW), перевод и объяснения, режим ошибок, пробный тест 33/60 мин.
- **Тетрадь ошибок** → личные карточки и грамматика по типу ошибки; входные тесты уровней; пробный DTZ раз в неделю; шкала готовности.
- PWA: офлайн для карточек и LiD (ответы синхронизируются при появлении сети), светлая тема, упрощённый режим, напоминание через календарь (.ics).

## Запуск

```bash
npm install
cp .env.example .env.local   # URL и publishable key проекта Supabase
npm run dev
```

| Команда | Что делает |
| --- | --- |
| `npm run build` / `npm run lint` / `npm test` | сборка, линтер, Vitest |
| `npm run seed` | генерирует `supabase/seed.sql` из `/content` (выполнить в SQL Editor) |
| `npm run tts` | озвучка фраз и диалогов Hören через Piper (`uvx`, локально) |

Миграции — `supabase/migrations/*.sql`.

## AI и ключи

AI работает через Groq по ключу пользователя (BYOK): ключ вводится в Профиле, хранится только в `localStorage` и уходит в заголовке `x-groq-key` в роуты `/api/ai/*`. Роуты ключ не сохраняют и не логируют; в коде и env ключей нет. Без ключа работают карточки, LiD, Hören/Lesen, тесты и аудио.

Промпты — `lib/ai/prompts` (версия `PROMPT_VERSION`), ответы проверяются Zod (`lib/ai/schemas.ts`).

## Стек

Next.js 16 (App Router, TypeScript strict), Tailwind 4, Motion, Supabase (Auth, Postgres, RLS), ts-fsrs, Zod, Serwist, Vitest, Vercel.
