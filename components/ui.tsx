"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { abs, formatMoney, isNegative, isZero } from "@/lib/money";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "secondary" &&
          "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        variant === "ghost" && "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
        variant === "danger" && "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950",
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{children}</h2>
      {action}
    </div>
  );
}

const fieldClass =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 sm:text-sm placeholder:text-zinc-400 " +
  "focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 " +
  "disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(fieldClass, className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(fieldClass, "pr-8", className)}>
      {children}
    </select>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
      {children}
    </p>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber"; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        tone === "green" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        tone === "amber" && "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Signed money: blue when the person receives, red when they owe (a colorblind-safe
 * diverging pair), always with an explicit +/− so color is never the only cue.
 */
export function Money({ value, currency, signed, className }: { value: string; currency: string; signed?: boolean; className?: string }) {
  const neg = isNegative(value);
  const zero = isZero(value);
  return (
    <span
      className={cx(
        "tabular-nums",
        signed && !zero && (neg ? "text-red-700 dark:text-red-400" : "text-blue-700 dark:text-blue-400"),
        className,
      )}
    >
      {signed && !zero ? (neg ? "− " : "+ ") : ""}
      {formatMoney(signed ? abs(value) : value, currency)}
    </span>
  );
}

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
];

export function Avatar({ id, name, size = "md" }: { id: number; name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
        AVATAR_COLORS[id % AVATAR_COLORS.length],
      )}
    >
      {initials || "?"}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {children && <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export { cx };
