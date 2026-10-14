"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, ApiError, fetcher, type Expense, type Group, type SplitType } from "@/lib/api";
import { formatDate, useRefreshGroup } from "@/lib/hooks";
import { formatMoney } from "@/lib/money";
import { Avatar, Badge, Button, Card, CardTitle, EmptyState, ErrorText, Skeleton } from "./ui";
import { ExpenseForm } from "./expense-form";

const SPLIT_LABEL: Record<SplitType, string> = {
  EQUAL: "Igualitário",
  PERCENT: "Porcentagem",
  EXACT: "Valor fixo",
  SHARES: "Pesos",
};

export function ExpensesTab({ group }: { group: Group }) {
  const { data: expenses, isLoading } = useSWR<Expense[]>(`/groups/${group.id}/expenses`, fetcher);
  const open = group.status === "OPEN";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
      <Card className="order-2 lg:order-1">
        <CardTitle>Despesas</CardTitle>
        {isLoading && <Skeleton className="h-40" />}
        {expenses?.length === 0 && <EmptyState title="Nenhuma despesa lançada">Use o formulário para lançar a primeira.</EmptyState>}
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {expenses?.map((e) => <ExpenseRow key={e.id} expense={e} group={group} />)}
        </ul>
      </Card>
      <div className="order-1 lg:order-2">
        {open ? (
          <ExpenseForm key={group.members.map((m) => m.id).join(",")} group={group} />
        ) : (
          <EmptyState title="Grupo fechado">Reabra o grupo na aba “Saldos e quitação” para lançar novas despesas.</EmptyState>
        )}
      </div>
    </div>
  );
}

function ExpenseRow({ expense: e, group }: { expense: Expense; group: Group }) {
  const refresh = useRefreshGroup(group.id);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Excluir “${e.description}”?`)) return;
    try {
      await api.delete(`/groups/${group.id}/expenses/${e.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  const inputLabel = (input: string | null) =>
    input === null ? null : e.splitType === "PERCENT" ? `${input}%` : e.splitType === "SHARES" ? `peso ${input}` : null;

  return (
    <li className="py-3">
      <button onClick={() => setExpanded((x) => !x)} className="flex w-full items-center gap-3 text-left" aria-expanded={expanded}>
        <Avatar id={e.payer.id} name={e.payer.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{e.description}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatDate(e.date)} · pago por {e.payer.name} · dividido entre {e.splits.length}
          </p>
        </div>
        <span className="font-semibold tabular-nums">{formatMoney(e.amount, group.currency)}</span>
        <span className="text-zinc-400" aria-hidden>
          {expanded ? "▴" : "▾"}
        </span>
      </button>

      {expanded && (
        <div className="ml-11 mt-3 flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <Badge>{SPLIT_LABEL[e.splitType]}</Badge>
            {group.status === "OPEN" && (
              <Button size="sm" variant="danger" onClick={remove}>
                Excluir
              </Button>
            )}
          </div>
          <ul className="flex flex-col gap-1">
            {e.splits.map((s) => (
              <li key={s.user.id} className="flex items-center justify-between gap-2">
                <span>
                  {s.user.name}
                  {inputLabel(s.input) && <span className="text-zinc-400"> · {inputLabel(s.input)}</span>}
                </span>
                <span className="tabular-nums">{formatMoney(s.share, group.currency)}</span>
              </li>
            ))}
          </ul>
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  );
}
