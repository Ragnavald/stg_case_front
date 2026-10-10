"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { fetcher, type Balances, type Group } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { Badge, cx, ErrorText, Skeleton } from "./ui";
import { MembersBar } from "./members-bar";
import { ExpensesTab } from "./expenses-tab";
import { SettlementPanel } from "./settlement-panel";
import { StatementView } from "./statement-view";

const TABS = [
  { id: "expenses", label: "Despesas" },
  { id: "settle", label: "Saldos e quitação" },
  { id: "statement", label: "Extrato individual" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function GroupView({ groupId }: { groupId: number }) {
  const { data: group, error } = useSWR<Group>(`/groups/${groupId}`, fetcher);
  const { data: balances } = useSWR<Balances>(`/groups/${groupId}/balances`, fetcher);
  const [tab, setTab] = useState<TabId>("expenses");
  const [statementUser, setStatementUser] = useState<number | null>(null);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorText>{error.status === 404 ? "Grupo não encontrado." : error.message}</ErrorText>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const closed = group.status === "CLOSED";
  const openStatement = (userId: number) => {
    setStatementUser(userId);
    setTab("statement");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
              {closed ? <Badge>Fechado</Badge> : <Badge tone="green">Aberto</Badge>}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Moeda {group.currency}
              {balances && <> · Total gasto {formatMoney(balances.totalSpent, group.currency)}</>}
            </p>
          </div>
          {balances && !balances.isSettled && (
            <button
              onClick={() => setTab("settle")}
              className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {balances.plan.length} {balances.plan.length === 1 ? "transferência pendente" : "transferências pendentes"} →
            </button>
          )}
        </div>
        <MembersBar group={group} onSelect={openStatement} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "expenses" && <ExpensesTab group={group} />}
      {tab === "settle" && <SettlementPanel group={group} onOpenStatement={openStatement} />}
      {tab === "statement" && (
        <StatementView group={group} userId={statementUser ?? group.members[0]?.id ?? null} onChangeUser={setStatementUser} />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="w-fit text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
      ← Grupos
    </Link>
  );
}
