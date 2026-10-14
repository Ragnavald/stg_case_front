"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher, type GroupSummary } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Badge, EmptyState, ErrorText, Skeleton } from "./ui";
import { NewGroupForm } from "./new-group-form";

export function GroupsHome() {
  const { data: groups, error, isLoading } = useSWR<GroupSummary[]>("/groups", fetcher);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Seus grupos</h2>
        {error && <ErrorText>{error.message}</ErrorText>}
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        {groups?.length === 0 && (
          <EmptyState title="Nenhum grupo ainda">Crie um grupo para começar a dividir despesas.</EmptyState>
        )}
        {groups?.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="break-words font-semibold sm:truncate text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100">{g.name}</p>
                {g.status === "CLOSED" && <Badge>Fechado</Badge>}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {g.memberCount} {g.memberCount === 1 ? "pessoa" : "pessoas"} · {g.expenseCount}{" "}
                {g.expenseCount === 1 ? "despesa" : "despesas"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total gasto</p>
              <p className="font-semibold tabular-nums">{formatMoney(g.totalSpent, g.currency)}</p>
            </div>
          </Link>
        ))}
      </div>
      <div>
        <NewGroupForm />
      </div>
    </div>
  );
}
