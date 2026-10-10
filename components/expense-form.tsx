"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, type Group, type SplitType } from "@/lib/api";
import { useRefreshGroup, today } from "@/lib/hooks";
import { EXPONENTS, formatMoney, fromScaled, largestRemainder, normalizeDecimal, toScaled } from "@/lib/money";
import { Avatar, Button, Card, CardTitle, cx, ErrorText, Field, Input, Select } from "./ui";

const SPLIT_TYPES: { id: SplitType; label: string; hint: string }[] = [
  { id: "EQUAL", label: "Igualitário", hint: "Divide o total em partes iguais" },
  { id: "PERCENT", label: "Porcentagem", hint: "Cada um paga um % do total (soma 100%)" },
  { id: "EXACT", label: "Valor fixo", hint: "Informe quanto cada um deve (soma = total)" },
  { id: "SHARES", label: "Pesos", hint: "Ex.: 2 para quem consumiu o dobro" },
];

const WEIGHT_SCALE = 4;
const HUNDRED = 100n * 10n ** BigInt(WEIGHT_SCALE);

export function ExpenseForm({ group }: { group: Group }) {
  const refresh = useRefreshGroup(group.id);
  const exp = EXPONENTS[group.currency] ?? 2;
  const money = (minor: bigint) => formatMoney(fromScaled(minor, exp), group.currency);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState<number>(group.members[0]?.id ?? 0);
  const [date, setDate] = useState(today);
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [selected, setSelected] = useState<Set<number>>(() => new Set(group.members.map((m) => m.id)));
  const [values, setValues] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const participants = group.members.filter((m) => selected.has(m.id));
  const normalizedAmount = normalizeDecimal(amount);
  const totalMinor = normalizedAmount ? toScaled(normalizedAmount, exp) : null;

  /** Live preview: per-person share plus a status line telling whether the split closes. */
  const preview = (() => {
    const shares = new Map<number, bigint>();
    let status: { ok: boolean; text: string } | null = null;
    if (participants.length === 0) return { shares, status: { ok: false, text: "Selecione ao menos um participante" } };

    const parse = (id: number, scale: number) => {
      const n = normalizeDecimal(values[id] ?? "");
      return n ? toScaled(n, scale) : null;
    };

    if (splitType === "EXACT") {
      let sum = 0n;
      for (const p of participants) {
        const v = parse(p.id, exp);
        if (v !== null) {
          shares.set(p.id, v);
          sum += v;
        }
      }
      if (totalMinor !== null) {
        const diff = totalMinor - sum;
        status =
          diff === 0n
            ? { ok: true, text: `Soma ${money(sum)} confere com o total` }
            : { ok: false, text: `${diff > 0n ? "Faltam" : "Sobram"} ${money(diff > 0n ? diff : -diff)} para fechar ${money(totalMinor)}` };
      }
      return { shares, status };
    }

    const weights = participants.map((p) => ({
      userId: p.id,
      weight: splitType === "EQUAL" ? 1n : (parse(p.id, WEIGHT_SCALE) ?? 0n),
    }));

    if (splitType === "PERCENT") {
      const sum = weights.reduce((a, w) => a + w.weight, 0n);
      const pct = (v: bigint) => `${Number(fromScaled(v, WEIGHT_SCALE)).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
      status =
        sum === HUNDRED
          ? { ok: true, text: "Porcentagens somam 100%" }
          : { ok: false, text: `Soma ${pct(sum)} — ${sum < HUNDRED ? "faltam" : "sobram"} ${pct(sum < HUNDRED ? HUNDRED - sum : sum - HUNDRED)}` };
      if (sum !== HUNDRED) return { shares, status };
    }

    if (totalMinor !== null && totalMinor > 0n) {
      for (const [id, share] of largestRemainder(totalMinor, weights)) shares.set(id, share);
    }
    if (splitType === "EQUAL" && totalMinor !== null && participants.length > 0) {
      const base = totalMinor / BigInt(participants.length);
      const odd = totalMinor % BigInt(participants.length);
      status = {
        ok: true,
        text:
          odd === 0n
            ? `${money(base)} para cada`
            : `${money(base)} para cada; a sobra de ${money(odd)} é distribuída uma unidade por pessoa, e a soma fecha em ${money(totalMinor)}`,
      };
    }
    return { shares, status };
  })();

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeDecimal(amount);
    if (!description.trim()) return setError("Informe uma descrição");
    if (!normalized) return setError("Informe um valor válido, ex.: 120,50");
    if (participants.length === 0) return setError("Selecione ao menos um participante");

    setSaving(true);
    try {
      await api.post(`/groups/${group.id}/expenses`, {
        description,
        amount: normalized,
        payerId,
        date,
        splitType,
        participants: participants.map((p) => ({
          userId: p.id,
          ...(splitType === "EQUAL" ? {} : { value: normalizeDecimal(values[p.id] ?? "") ?? (values[p.id] ?? "") }),
        })),
      });
      setDescription("");
      setAmount("");
      setValues({});
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  const valueSuffix = splitType === "PERCENT" ? "%" : splitType === "SHARES" ? "×" : group.currency;

  return (
    <Card>
      <CardTitle>Nova despesa</CardTitle>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Descrição">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jantar, Uber, mercado…" maxLength={120} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Valor (${group.currency})`}>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="tabular-nums" />
          </Field>
          <Field label="Data">
            <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Pago por">
          <Select value={payerId} onChange={(e) => setPayerId(Number(e.target.value))}>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Dividir</span>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800" role="radiogroup">
            {SPLIT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={splitType === t.id}
                onClick={() => setSplitType(t.id)}
                className={cx(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  splitType === t.id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{SPLIT_TYPES.find((t) => t.id === splitType)!.hint}</span>
        </div>

        <ul className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {group.members.map((m) => {
            const on = selected.has(m.id);
            const share = preview.shares.get(m.id);
            return (
              <li key={m.id} className={cx("flex items-center gap-3 px-3 py-2", !on && "opacity-50")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(m.id)}
                  className="size-4 accent-emerald-600"
                  aria-label={`Incluir ${m.name}`}
                />
                <Avatar id={m.id} name={m.name} size="sm" />
                <span className="flex-1 truncate text-sm">{m.name}</span>
                {on && splitType !== "EQUAL" && (
                  <div className="relative w-24">
                    <Input
                      value={values[m.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                      inputMode="decimal"
                      placeholder={splitType === "SHARES" ? "1" : "0"}
                      className="h-8 pr-9 text-right tabular-nums"
                      aria-label={`Valor de ${m.name}`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-zinc-400">
                      {valueSuffix}
                    </span>
                  </div>
                )}
                <span className="w-24 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                  {on && share !== undefined && splitType !== "EXACT" ? money(share) : ""}
                </span>
              </li>
            );
          })}
        </ul>

        {preview.status && (
          <p className={cx("text-xs", preview.status.ok ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
            {preview.status.text}
          </p>
        )}

        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={saving}>
          Lançar despesa
        </Button>
      </form>
    </Card>
  );
}
