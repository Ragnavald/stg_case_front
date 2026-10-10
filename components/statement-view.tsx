"use client";

import useSWR from "swr";
import { fetcher, type Balances, type Group, type Statement } from "@/lib/api";
import { formatDate } from "@/lib/hooks";
import { abs, formatMoney, isNegative, isZero } from "@/lib/money";
import { Avatar, Card, CardTitle, cx, EmptyState, ErrorText, Money, Skeleton } from "./ui";

export function StatementView({
  group,
  userId,
  onChangeUser,
}: {
  group: Group;
  userId: number | null;
  onChangeUser: (id: number) => void;
}) {
  const { data, error } = useSWR<Statement>(userId ? `/groups/${group.id}/members/${userId}/statement` : null, fetcher);
  const { data: balances } = useSWR<Balances>(`/groups/${group.id}/balances`, fetcher);

  // Former members with an open balance can still be inspected
  const people = balances?.balances.map((b) => b.user) ?? group.members;

  if (!userId) return <EmptyState title="Sem integrantes" />;

  const myPlan = balances?.plan.filter((t) => t.from.id === userId || t.to.id === userId) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Integrante">
        {people.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === userId}
            onClick={() => onChangeUser(p.id)}
            className={cx(
              "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
              p.id === userId
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900",
            )}
          >
            <Avatar id={p.id} name={p.name} size="sm" />
            {p.name}
          </button>
        ))}
      </div>

      {error && <ErrorText>{error.message}</ErrorText>}
      {!data && !error && <Skeleton className="h-80" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryTile label="Pagou em despesas" value={formatMoney(data.summary.paid, data.currency)} />
            <SummaryTile label="Sua parte" value={formatMoney(data.summary.owed, data.currency)} />
            <SummaryTile label="Pagamentos enviados" value={formatMoney(data.summary.settlementsSent, data.currency)} />
            <SummaryTile label="Pagamentos recebidos" value={formatMoney(data.summary.settlementsReceived, data.currency)} />
            <div className="col-span-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:col-span-1 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Saldo</p>
              <p className="mt-1 text-xl font-semibold">
                <Money value={data.summary.balance} currency={data.currency} signed />
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isZero(data.summary.balance) ? "quitado" : isNegative(data.summary.balance) ? "deve ao grupo" : "tem a receber"}
              </p>
            </div>
          </div>

          {myPlan.length > 0 && (
            <Card className="ring-1 ring-emerald-600/30">
              <CardTitle>Para {data.user.name} quitar</CardTitle>
              <ul className="flex flex-col gap-1 text-sm">
                {myPlan.map((t) => (
                  <li key={`${t.from.id}-${t.to.id}`}>
                    {t.from.id === userId ? (
                      <>
                        Pagar <strong className="tabular-nums">{formatMoney(t.amount, data.currency)}</strong> para{" "}
                        <strong>{t.to.name}</strong>
                      </>
                    ) : (
                      <>
                        Receber <strong className="tabular-nums">{formatMoney(t.amount, data.currency)}</strong> de{" "}
                        <strong>{t.from.name}</strong>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardTitle>Extrato de {data.user.name}</CardTitle>
            {data.entries.length === 0 ? (
              <EmptyState title="Nenhuma movimentação" />
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2 font-medium">Data</th>
                      <th className="py-2 font-medium">Movimentação</th>
                      <th className="py-2 text-right font-medium">Pagou</th>
                      <th className="py-2 text-right font-medium">Sua parte</th>
                      <th className="py-2 text-right font-medium">Efeito no saldo</th>
                      <th className="py-2 text-right font-medium">Saldo acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.entries.map((e) => (
                      <tr key={`${e.type}-${e.refId}`}>
                        <td className="whitespace-nowrap py-2.5 text-zinc-500 dark:text-zinc-400">{formatDate(e.date)}</td>
                        <td className="py-2.5">
                          {e.type === "EXPENSE" ? (
                            <>
                              {e.description}
                              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                {e.counterpart ? `pago por ${e.counterpart.name}` : `pago por ${data.user.name}`}
                              </span>
                            </>
                          ) : e.type === "SETTLEMENT_SENT" ? (
                            <>Pagamento para {e.counterpart?.name}</>
                          ) : (
                            <>Pagamento de {e.counterpart?.name}</>
                          )}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{isZero(e.paid) ? "—" : formatMoney(e.paid, data.currency)}</td>
                        <td className="py-2.5 text-right tabular-nums">{isZero(e.share) ? "—" : formatMoney(e.share, data.currency)}</td>
                        <td className="py-2.5 text-right">
                          <Money value={e.effect} currency={data.currency} signed />
                        </td>
                        <td className="py-2.5 text-right font-medium tabular-nums">
                          {isNegative(e.runningBalance) ? "− " : ""}
                          {formatMoney(abs(e.runningBalance), data.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
