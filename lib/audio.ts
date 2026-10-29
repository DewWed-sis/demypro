"use client";

// Готовое аудио (Piper) если есть, иначе лучший немецкий голос браузера.
let cachedVoice: SpeechSynthesisVoice | null | undefined;

function germanVoice() {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
  if (!voices.length) return null; // голоса ещё не загрузились — попробуем в следующий раз
  const score = (v: SpeechSynthesisVoice) =>
    (/premium|enhanced|natural|neural/i.test(v.name) ? 4 : 0) +
    (/google|anna|helena|petra|markus|yannick/i.test(v.name) ? 2 : 0) +
    (v.lang === "de-DE" ? 1 : 0);
  cachedVoice = voices.sort((a, b) => score(b) - score(a))[0];
  return cachedVoice;
}

export function speak(text: string, rate = 0.95) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = rate;
  const v = germanVoice();
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

export function play(item: { de: string; audio_url?: string | null }) {
  if (item.audio_url) {
    new Audio(item.audio_url).play().catch(() => speak(item.de));
  } else {
    speak(item.de.replace(/\s—\s/g, ", "));
  }
}
