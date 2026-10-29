"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";
import { motion } from "motion/react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function GlassCard({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("glass rounded-3xl p-5", className)} {...p} />;
}

type Variant = "primary" | "ghost";
export function GlassButton({
  className,
  variant = "ghost",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cx(
        "rounded-2xl px-5 py-3 font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary"
          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-900/40 hover:brightness-110"
          : "glass hover:bg-white/15",
        className,
      )}
      {...p}
    />
  );
}

export function GlassInput({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-violet-50 placeholder:text-violet-200/60 outline-none focus:border-violet-300",
        className,
      )}
      {...p}
    />
  );
}

export function ProgressRing({ value, size = 160, label }: { value: number; size?: number; label?: string }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / 0.12)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center" role="img" aria-label={`${label ?? ""} ${Math.round(v * 100)}%`}>
        <div className="text-3xl font-semibold">{Math.round(v * 100)}%</div>
        {label && <div className="text-xs text-violet-200">{label}</div>}
      </div>
    </div>
  );
}

export function ReadinessBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span lang="de">{label}</span>
        <span className="text-violet-200">{Math.round(v * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
          initial={{ width: 0 }}
          animate={{ width: `${v * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
