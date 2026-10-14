export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ---------------------------------------------------------------------------
// Contracts (money always travels as decimal strings, e.g. "100.00")
// ---------------------------------------------------------------------------

export type Person = { id: number; name: string };
export type GroupStatus = "OPEN" | "CLOSED";
export type SplitType = "EQUAL" | "PERCENT" | "SHARES" | "EXACT";

export type GroupSummary = {
  id: number;
  name: string;
  currency: string;
  status: GroupStatus;
  createdAt: string;
  memberCount: number;
  expenseCount: number;
  totalSpent: string;
};

export type Group = {
  id: number;
  name: string;
  currency: string;
  status: GroupStatus;
  createdAt: string;
  closedAt: string | null;
  members: Person[];
};

export type Expense = {
  id: number;
  description: string;
  amount: string;
  splitType: SplitType;
  date: string;
  createdAt: string;
  payer: Person;
  splits: { user: Person; share: string; input: string | null }[];
};

export type Settlement = {
  id: number;
  from: Person;
  to: Person;
  amount: string;
  createdAt: string;
};

export type Balances = {
  currency: string;
  status: GroupStatus;
  totalSpent: string;
  isSettled: boolean;
  balances: {
    user: Person;
    isMember: boolean;
    paid: string;
    owed: string;
    settlementsSent: string;
    settlementsReceived: string;
    balance: string;
  }[];
  plan: { from: Person; to: Person; amount: string }[];
  stats: { pairwiseTransfers: number; simplifiedTransfers: number };
};

export type Statement = {
  user: Person;
  currency: string;
  summary: { paid: string; owed: string; settlementsSent: string; settlementsReceived: string; balance: string };
  entries: {
    type: "EXPENSE" | "SETTLEMENT_SENT" | "SETTLEMENT_RECEIVED";
    refId: number;
    date: string;
    description: string;
    counterpart: Person | null;
    paid: string;
    share: string;
    effect: string;
    runningBalance: string;
  }[];
};

export type Currency = { code: string; exponent: number };

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(`Não foi possível conectar à API em ${API_URL}`, 0);
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(translateError(body.error ?? res.statusText), res.status);
  return body as T;
}

/** SWR fetcher: the key is the API path. */
export const fetcher = <T>(path: string) => request<T>(path);

export const api = {
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};

/** The API speaks English; translate the messages a user is likely to see. */
function translateError(message: string): string {
  const rules: [RegExp, (...m: string[]) => string][] = [
    [/^Percentages must add up to 100 \(got (.+)\)$/, (_, got) => `As porcentagens devem somar 100% (soma atual: ${Number(got)}%)`],
    [
      /^Exact amounts add up to (.+) but the expense is (.+) \((.+) (missing|over)\)$/,
      (_, sum, total, diff, kind) =>
        `Os valores somam ${sum}, mas a despesa é de ${total} (${kind === "missing" ? "faltam" : "sobram"} ${diff})`,
    ],
    [/has more than (\d+) decimal place/, (_, n) => `Valor com mais de ${n} casa(s) decimal(is)`],
    [/must be a non-negative decimal/, () => "Valor inválido; use o formato 123,45"],
    [/^Group still has (\d+) pending transfer/, (_, n) => `Ainda há ${n} transferência(s) pendente(s) para quitar`],
    [/^Member still (owes|is owed) (\w+) (.+); settle up/, (_, kind, cur, v) =>
      `Este integrante ainda ${kind === "owes" ? "deve" : "tem a receber"} ${cur} ${v}; quite antes de remover`],
    [/^Group is closed/, () => "O grupo está fechado; reabra-o para fazer alterações"],
    [/already a member/, () => "Essa pessoa já participa do grupo"],
    [/are not members of this group/, () => "Todos os participantes precisam ser integrantes do grupo"],
    [/cannot be in the future/, () => "A data da despesa não pode estar no futuro"],
    [/Split weights must add up to more than zero/, () => "Os pesos precisam somar mais que zero"],
    [/^Missing/, () => "Preencha o valor de cada participante"],
    [/Payer and receiver must be different/, () => "Quem paga e quem recebe devem ser pessoas diferentes"],
    [/Amount must be greater than zero/, () => "O valor deve ser maior que zero"],
    [/is too large/, () => "Valor grande demais"],
  ];
  for (const [re, fn] of rules) {
    const m = message.match(re);
    if (m) return fn(...m);
  }
  return message;
}
