export type Lang = "ru" | "uk";

const dict = {
  today: { ru: "Сегодня", uk: "Сьогодні" },
  learn: { ru: "Учить", uk: "Вчити" },
  exam: { ru: "Экзамен", uk: "Іспит" },
  lid: { ru: "LiD", uk: "LiD" },
  profile: { ru: "Профиль", uk: "Профіль" },
  startSession: { ru: "Начать сессию", uk: "Почати сесію" },
  dayProgress: { ru: "Прогресс дня", uk: "Прогрес дня" },
  readiness: { ru: "Готовность к DTZ", uk: "Готовність до DTZ" },
  streak: { ru: "Стрик", uk: "Стрік" },
  days: { ru: "дн.", uk: "дн." },
  soon: { ru: "Скоро — в следующих этапах", uk: "Незабаром — у наступних етапах" },
  // auth
  signIn: { ru: "Войти", uk: "Увійти" },
  signUp: { ru: "Регистрация", uk: "Реєстрація" },
  signOut: { ru: "Выйти", uk: "Вийти" },
  email: { ru: "E-mail", uk: "E-mail" },
  password: { ru: "Пароль", uk: "Пароль" },
  magicLink: { ru: "Войти по ссылке на почту", uk: "Увійти за посиланням на пошту" },
  checkMail: { ru: "Проверь почту — там ссылка для входа.", uk: "Перевір пошту — там посилання для входу." },
  checkMailConfirm: { ru: "Проверь почту и подтверди регистрацию.", uk: "Перевір пошту й підтверди реєстрацію." },
  tagline: { ru: "Немецкий с нуля до B1 и DTZ", uk: "Німецька з нуля до B1 і DTZ" },
  // settings
  settings: { ru: "Настройки", uk: "Налаштування" },
  uiLang: { ru: "Язык объяснений", uk: "Мова пояснень" },
  dailyGoal: { ru: "Цель в день, минут", uk: "Ціль на день, хвилин" },
  groqKey: { ru: "Ключ Groq", uk: "Ключ Groq" },
  groqKeyHint: {
    ru: "Хранится только на этом устройстве. Получить: console.groq.com → API Keys.",
    uk: "Зберігається лише на цьому пристрої. Отримати: console.groq.com → API Keys.",
  },
  checkKey: { ru: "Проверить ключ", uk: "Перевірити ключ" },
  keyOk: { ru: "Ключ работает", uk: "Ключ працює" },
  keyBad: { ru: "Ключ не принят", uk: "Ключ не прийнято" },
  model: { ru: "Модель для диалогов и проверки", uk: "Модель для діалогів і перевірки" },
  simpleMode: { ru: "Упрощённый режим (без размытия)", uk: "Спрощений режим (без розмиття)" },
  save: { ru: "Сохранить", uk: "Зберегти" },
  saved: { ru: "Сохранено", uk: "Збережено" },
  needKey: { ru: "Добавь ключ Groq в настройках", uk: "Додай ключ Groq у налаштуваннях" },
  loading: { ru: "Загрузка…", uk: "Завантаження…" },
  error: { ru: "Ошибка", uk: "Помилка" },
} as const;

export type Key = keyof typeof dict;
export const t = (k: Key, lang: Lang) => dict[k][lang];
