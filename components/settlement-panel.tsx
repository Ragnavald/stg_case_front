"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, ApiError, fetcher, type Balances, type Group, type Settlement } from "@/lib/api";
import { formatTimestamp, useRefreshGroup } from "@/lib/hooks";
import { abs, formatMoney, isNegative, isZero } from "@/lib/money";
import { Avatar, Button, Card, CardTitle, cx, EmptyState, ErrorText, Money, Skeleton } from "./ui";

export function SettlementPanel({ group }: { group: Group }) {
  const { data, error } = useSWR<Balances>(`/groups/${group.id}/balances`, fetcher);
  const { data: settlements } = useSWR<Settlement[]>(`/groups/${group.id}/settlements`, fetcher);

  if (error) return <ErrorText>{error.message}</ErrorText>;
  if (!data) return <Skeleton className="h-96" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-6">
        <Stats data={data} />
        <BalancesCard group={group} data={data} />
      </div>
      <div className="flex flex-col gap-6">
        <PlanCard group={group} data={data} />
        <HistoryCard group={group} settlements={settlements} />
      </div>
    </div>
  );
}

function Stats({ data }: { data: Balances }) {
  const { pairwiseTransfers: before, simplifiedTransfers: after } = data.stats;
  const saved = before - after;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile label="Total gasto" value={formatMoney(data.totalSpent, data.currency)} className="col-span-2 sm:col-span-1" />
      <Tile label="Sem simplificação" value={`${before}`} sub={before === 1 ? "transferência" : "transferências"} />
      <Tile
        label="Com simplificação"
        value={`${after}`}
        sub={saved > 0 ? `${saved} a menos` : after === 1 ? "transferência" : "transferências"}
        highlight={saved > 0}
      />
    </div>
  );
}

function Tile({ label, value, sub, highlight, className }: { label: string; value: string; sub?: string; highlight?: boolean; className?: string }) {
  return (
    <div className={cx("min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900", className)}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</p>
      {sub && (
        <p className={cx("text-xs", highlight ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400")}>
          {sub}
        </p>
      )}
    </div>
  );
}

/**
 * Diverging bar per person, centered on zero: blue to the right = receives,
 * red to the left = owes. Hover a row for the breakdown; "Tabela" shows the same data as a table.
 */
function BalancesCard({ group, data }: { group: Group; data: Balances }) {
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.balances.map((b) => Math.abs(Number(b.balance))), 0);

  return (
    <Card>
      <CardTitle
        action={
          <Button size="sm" variant="ghost" onClick={() => setAsTable((t) => !t)}>
            {asTable ? "Gráfico" : "Tabela"}
          </Button>
        }
      >
        Saldo de cada um
      </CardTitle>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="py-2 font-medium">Pessoa</th>
                <th className="py-2 text-right font-medium">Pagou</th>
                <th className="py-2 text-right font-medium">Sua parte</th>
                <th className="py-2 text-right font-medium">Enviou</th>
                <th className="py-2 text-right font-medium">Recebeu</th>
                <th className="py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.balances.map((b) => (
                <tr key={b.user.id}>
                  <td className="py-2">{b.user.name}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(b.paid, data.currency)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(b.owed, data.currency)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(b.settlementsSent, data.currency)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(b.settlementsReceived, data.currency)}</td>
                  <td className="py-2 text-right font-medium">
                    <Money value={b.balance} currency={data.currency} signed />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="mb-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-red-600 dark:bg-red-500" /> deve
            </span>
            <span className="flex items-center gap-1.5">
              tem a receber <span className="size-2.5 rounded-sm bg-blue-600 dark:bg-blue-500" />
            </span>
          </div>
          <ul className="flex flex-col">
            {data.balances.map((b) => {
              const neg = isNegative(b.balance);
              const zero = isZero(b.balance);
              const pct = max > 0 ? (Math.abs(Number(b.balance)) / max) * 50 : 0;
              return (
                <li
                  key={b.user.id}
                  className="relative"
                  onMouseEnter={() => setHover(b.user.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <button
                    onFocus={() => setHover(b.user.id)}
                    onBlur={() => setHover(null)}
                    className="grid w-full grid-cols-[minmax(0,7rem)_1fr_7rem] items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    aria-label={`${b.user.name}: ${zero ? "quitado" : neg ? "deve" : "tem a receber"} ${formatMoney(abs(b.balance), data.currency)}.`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <Avatar id={b.user.id} name={b.user.name} size="sm" />
                      <span className="truncate">{b.user.name}</span>
                    </span>
                    <span className="relative h-5">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
                      {!zero && (
                        <span
                          aria-hidden
                          className={cx(
                            "absolute inset-y-0.5",
                            neg ? "rounded-l bg-red-600 dark:bg-red-500" : "rounded-r bg-blue-600 dark:bg-blue-500",
                          )}
                          style={neg ? { right: "calc(50% + 1px)", width: `max(${pct}%, 2px)` } : { left: "calc(50% + 1px)", width: `max(${pct}%, 2px)` }}
                        />
                      )}
                    </span>
                    <span className="text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                      {zero ? <span className="text-zinc-400">quitado</span> : `${neg ? "− " : "+ "}${formatMoney(abs(b.balance), data.currency)}`}
                    </span>
                  </button>
                  {hover === b.user.id && (
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 w-64 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="mb-1.5 font-semibold">{b.user.name}{!b.isMember && " (ex-integrante)"}</p>
                      <Row k="Pagou despesas" v={formatMoney(b.paid, data.currency)} />
                      <Row k="Sua parte" v={`− ${formatMoney(b.owed, data.currency)}`} />
                      <Row k="Pagamentos enviados" v={`+ ${formatMoney(b.settlementsSent, data.currency)}`} />
                      <Row k="Pagamentos recebidos" v={`− ${formatMoney(b.settlementsReceived, data.currency)}`} />
                      <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800">
                        <Row k="Saldo" v={`${neg ? "− " : zero ? "" : "+ "}${formatMoney(abs(b.balance), data.currency)}`} bold />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {group.members.length === 0 && <EmptyState title="Sem integrantes" />}
    </Card>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <p className={cx("flex justify-between gap-2 tabular-nums", bold && "font-semibold")}>
      <span className="text-zinc-500 dark:text-zinc-400">{k}</span>
      <span>{v}</span>
    </p>
  );
}

function PlanCard({ group, data }: { group: Group; data: Balances }) {
  const refresh = useRefreshGroup(group.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = group.status === "OPEN";

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setBusy(null);
    }
  }

  const pay = (i: number) => {
    const t = data.plan[i]!;
    return run(`pay${i}`, () =>
      api.post(`/groups/${group.id}/settlements`, { fromUserId: t.from.id, toUserId: t.to.id, amount: t.amount }),
    );
  };

  const close = (settleAll: boolean) => {
    const msg = settleAll
      ? `Registrar as ${data.plan.length} transferência(s) como pagas e fechar o grupo?`
      : "Fechar o grupo? Novas despesas ficarão bloqueadas.";
    if (!confirm(msg)) return;
    return run("close", () => api.post(`/groups/${group.id}/close`, { settleAll }));
  };

  return (
    <Card className={cx(!data.isSettled && "ring-1 ring-emerald-600/30")}>
      <CardTitle>Plano de quitação</CardTitle>

      {data.isSettled ? (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          <p className="font-semibold">Tudo quitado ✓</p>
          <p>Ninguém deve nada a ninguém neste grupo.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            O menor número de transferências que zera todos os saldos.
          </p>
          <ol className="flex flex-col gap-2">
            {data.plan.map((t, i) => (
              <li key={`${t.from.id}-${t.to.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                  <span className="flex items-center gap-2">
                    <Avatar id={t.from.id} name={t.from.name} size="sm" />
                    <span className="truncate font-medium">{t.from.name}</span>
                  </span>
                  <span className="flex items-center gap-2 pl-1 text-xs text-zinc-500 dark:text-zinc-400">
                    ↓ paga {formatMoney(t.amount, data.currency)} para
                  </span>
                  <span className="flex items-center gap-2">
                    <Avatar id={t.to.id} name={t.to.name} size="sm" />
                    <span className="truncate font-medium">{t.to.name}</span>
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-semibold tabular-nums">{formatMoney(t.amount, data.currency)}</span>
                  {open && (
                    <Button size="sm" variant="secondary" loading={busy === `pay${i}`} disabled={busy !== null} onClick={() => pay(i)}>
                      Marcar como pago
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <ErrorText>{error}</ErrorText>

      <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {open ? (
          data.isSettled ? (
            <Button className="w-full" variant="secondary" loading={busy === "close"} onClick={() => close(false)}>
              Fechar grupo
            </Button>
          ) : (
            <Button className="w-full" loading={busy === "close"} disabled={busy !== null} onClick={() => close(true)}>
              Quitar tudo e fechar grupo
            </Button>
          )
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span>Grupo fechado{group.closedAt && ` em ${formatTimestamp(group.closedAt)}`}.</span>
            <Button size="sm" variant="ghost" loading={busy === "reopen"} onClick={() => run("reopen", () => api.post(`/groups/${group.id}/reopen`))}>
              Reabrir
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function HistoryCard({ group, settlements }: { group: Group; settlements?: Settlement[] }) {
  const refresh = useRefreshGroup(group.id);
  const [error, setError] = useState<string | null>(null);

  async function undo(s: Settlement) {
    if (!confirm(`Desfazer o pagamento de ${s.from.name} para ${s.to.name}?`)) return;
    try {
      await api.delete(`/groups/${group.id}/settlements/${s.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  if (!settlements || settlements.length === 0) return null;

  return (
    <Card>
      <CardTitle>Pagamentos registrados</CardTitle>
      <ul className="flex flex-col divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
        {settlements.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2">
            <span className="flex-1">
              <span className="font-medium">{s.from.name}</span> pagou <span className="font-medium">{s.to.name}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{formatTimestamp(s.createdAt)}</span>
            </span>
            <span className="tabular-nums">{formatMoney(s.amount, group.currency)}</span>
            {group.status === "OPEN" && (
              <Button size="sm" variant="ghost" onClick={() => undo(s)}>
                Desfazer
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
