"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, type Group } from "@/lib/api";
import { useRefreshGroup } from "@/lib/hooks";
import { Avatar, Button, ErrorText, Input } from "./ui";

export function MembersBar({ group, onSelect }: { group: Group; onSelect: (userId: number) => void }) {
  const refresh = useRefreshGroup(group.id);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = group.status === "OPEN";

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/groups/${group.id}/members`, { name });
      setName("");
      setAdding(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, memberName: string) {
    if (!confirm(`Remover ${memberName} do grupo?`)) return;
    setError(null);
    try {
      await api.delete(`/groups/${group.id}/members/${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap items-center gap-2">
        {group.members.map((m) => (
          <li
            key={m.id}
            className="group flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button onClick={() => onSelect(m.id)} className="flex items-center gap-1.5 hover:text-emerald-700" title="Ver extrato">
              <Avatar id={m.id} name={m.name} size="sm" />
              {m.name}
            </button>
            {open && (
              <button
                onClick={() => remove(m.id, m.name)}
                className="text-zinc-300 hover:text-rose-600 dark:text-zinc-600"
                aria-label={`Remover ${m.name}`}
              >
                ×
              </button>
            )}
          </li>
        ))}
        {open && !adding && (
          <li>
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
              + Integrante
            </Button>
          </li>
        )}
        {adding && (
          <li>
            <form onSubmit={add} className="flex items-center gap-2">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome"
                className="h-8 w-40"
                maxLength={80}
              />
              <Button size="sm" type="submit" loading={busy}>
                Adicionar
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </form>
          </li>
        )}
      </ul>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
