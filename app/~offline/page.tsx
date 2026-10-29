export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="glass max-w-sm space-y-3 rounded-3xl p-6">
        <h1 className="text-xl font-semibold">Нет сети · Немає мережі</h1>
        <p className="text-violet-200">
          Карточки и LiD работают офлайн, если ты открывал(а) их раньше. AI-проверка вернётся, когда появится интернет.
        </p>
        <a href="/learn/cards?mode=review" className="inline-block underline">Повторение →</a>
      </div>
    </main>
  );
}
