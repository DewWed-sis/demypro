# PLAN.md — Deutsch A1→B1

Спецификация: CLAUDE.md. Состояние: PROGRESS.md.
После каждого этапа: `npm run build` + `npm run lint` без ошибок → проверка в браузере → git commit → PROGRESS.md.

## Этап 1. Каркас
- Next.js (App Router, TS strict), Tailwind, Framer Motion, Zod, git
- Дизайн-система «жидкое стекло»: Aurora-фон, GlassCard, GlassButton, GlassInput, GlassNav, ProgressRing, ReadinessBar
- Supabase: клиент (browser/server, @supabase/ssr), Auth email+пароль и magic link, middleware сессии
- Миграция SQL: все таблицы контента и личные, RLS, триггер `profiles`
- Настройки: язык ru/uk, цель минут, ключ Groq (localStorage) + «Проверить ключ» → `/api/ai/ping`, выбор модели
- Скелет экранов: Сегодня, Учить, Экзамен, LiD, Профиль, вход
- CSP, `.env.example`, README, превью-деплой Vercel

## Этап 2. Карточки и старт A1
- ts-fsrs, экран повторения Again/Hard/Good/Easy, Flashcard с переворотом
- Алфавит и произношение (ä ö ü ch r), цвет артиклей
- `/content` JSON-сиды: первые 300 фраз A1, `npm run seed`
- `npm run tts` (Piper) → Storage → `audio_url`
- Генератор плана дня, стрик

## Этап 3. LiD
- Импорт официального каталога BAMF (300 + 10 NRW); если не скачивается — запрос файла у владельца
- Переводы ru/uk, объяснения, карточки FSRS
- По темам, «только ошибки», пробный тест 33/60 мин (пороги 15/17)

## Этап 4. Голос
- RecordButton, MediaRecorder (webm/mp4), `/api/ai/transcribe` (whisper-large-v3-turbo, de)
- Shadowing с подсветкой расхождений, speechSynthesis с лучшим немецким голосом

## Этап 5. Sprechen с AI
- `/api/ai/chat` (streaming), симулятор 3 частей DTZ
- `/api/ai/evaluate-speaking`, `/api/ai/extract-errors` → `error_log` → автокарточки

## Этап 6. Schreiben с AI
- Конструктор письма (задание → 4 пункта → текст), шаблоны formell/informell
- `/api/ai/evaluate-writing` (Zod, повтор при невалидном JSON), подсветка правок, банк клише, история

## Этап 7. Hören и Lesen
- Сверка формата с Modelltest DTZ (g.a.s.t.)
- Задания с таймером, тренинг ловушек, диалоги разными голосами Piper

## Этап 8. Контент A1→B1 полностью
- 12 тем × 3 уровня, грамматика, входные тесты уровней, пробный DTZ раз в неделю, шкала готовности

## Этап 9. Полировка
- Serwist PWA + офлайн карточек и LiD, напоминания, анимации/конфетти, упрощённый режим, светлая тема
- Vitest: FSRS, план дня, оценка
- Итоговое резюме, грабли, что дальше
