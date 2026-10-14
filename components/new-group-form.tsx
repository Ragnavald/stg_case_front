"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { api, ApiError, fetcher, type Currency, type Group, type Person } from "@/lib/api";
import { Avatar, Button, Card, CardTitle, ErrorText, Field, Input, Select } from "./ui";

type Draft = { key: string; name: string; userId?: number };

export function NewGroupForm() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: currencies } = useSWR<Currency[]>("/currencies", fetcher);
  const { data: people } = useSWR<Person[]>("/users", fetcher);

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [memberName, setMemberName] = useState("");
  const [members, setMembers] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addNew = () => {
    const n = memberName.trim();
    if (!n) return;
    setMembers((m) => [...m, { key: crypto.randomUUID(), name: n }]);
    setMemberName("");
  };

  const addExisting = (p: Person) =>
    setMembers((m) => (m.some((d) => d.userId === p.id) ? m : [...m, { key: `u${p.id}`, name: p.name, userId: p.id }]));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNew();
    }
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // A name still typed in the box counts as a member
    const pending = memberName.trim() ? [...members, { key: "pending", name: memberName.trim() }] : members;
    if (!name.trim()) return setError("Dê um nome ao grupo");
    if (pending.length < 2) return setError("Adicione pelo menos duas pessoas");

    setSaving(true);
    try {
      const group = await api.post<Group>("/groups", {
        name,
        currency,
        members: pending.map((m) => (m.userId ? { userId: m.userId } : { name: m.name })),
      });
      await mutate("/groups");
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
      setSaving(false);
    }
  }

  const suggestions = (people ?? []).filter((p) => !members.some((m) => m.userId === p.id));

  return (
    <Card>
      <CardTitle>Novo grupo</CardTitle>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Viagem para Floripa" maxLength={80} />
          </Field>
          <Field label="Moeda">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-24">
              {(currencies ?? [{ code: "BRL", exponent: 2 }]).map((c) => (
                <option key={c.code}>{c.code}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Integrantes">
          <div className="flex gap-2">
            <Input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Nome e Enter"
              maxLength={80}
            />
            <Button type="button" variant="secondary" onClick={addNew}>
              Adicionar
            </Button>
          </div>
        </Field>

        {members.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => (
              <li
                key={m.key}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 py-1 pl-1 pr-2 text-sm dark:border-zinc-700"
              >
                <Avatar id={m.userId ?? m.name.length} name={m.name} size="sm" />
                {m.name}
                <button
                  type="button"
                  onClick={() => setMembers((all) => all.filter((x) => x.key !== m.key))}
                  className="-my-1 ml-0.5 px-1 py-1 text-zinc-400 hover:text-rose-600"
                  aria-label={`Remover ${m.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {suggestions.length > 0 && (
          <div className="text-sm">
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Ou adicione quem já participa de outros grupos:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addExisting(p)}
                  className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-zinc-600 hover:border-emerald-600 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-400"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={saving}>
          Criar grupo
        </Button>
      </form>
    </Card>
  );
}
