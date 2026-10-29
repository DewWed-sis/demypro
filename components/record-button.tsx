"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

// Safari на iPhone пишет mp4/aac, Chrome — webm/opus.
const MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
const pickMime = () => MIMES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

/** Кнопка записи: тап — старт, тап — стоп. Пульсирующее кольцо и звуковая волна по громкости. */
export function RecordButton({
  onRecorded,
  disabled,
  maxSec = 90,
  label,
}: {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
  maxSec?: number;
  label: { start: string; stop: string; denied: string };
}) {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [denied, setDenied] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setDenied(true);
      return;
    }
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      raf = requestAnimationFrame(tick);
    };
    tick();
    const timer = setTimeout(() => stopRef.current(), maxSec * 1000);

    rec.onstop = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      setRecording(false);
      setLevel(0);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      if (blob.size > 1000) onRecorded(blob);
    };
    stopRef.current = () => rec.state === "recording" && rec.stop();
    rec.start();
    setRecording(true);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid size-28 place-items-center">
        {recording && (
          <motion.span
            className="absolute inset-0 rounded-full bg-fuchsia-500/30"
            animate={{ scale: [1, 1.25 + level * 0.4, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => (recording ? stopRef.current() : start())}
          aria-pressed={recording}
          aria-label={recording ? label.stop : label.start}
          className={`relative grid size-24 place-items-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-50 ${
            recording ? "bg-err shadow-red-900/40" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-900/40"
          }`}
        >
          {recording ? (
            <span className="size-7 rounded-md bg-white" />
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </button>
      </div>
      <div className="flex h-8 items-center gap-1" aria-hidden>
        {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 0.4].map((k, i) => (
          <motion.span
            key={i}
            className="w-1.5 rounded-full bg-violet-300"
            animate={{ height: recording ? 6 + level * 26 * k : 4 }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
      <p className="text-sm text-violet-200">{denied ? label.denied : recording ? label.stop : label.start}</p>
    </div>
  );
}
