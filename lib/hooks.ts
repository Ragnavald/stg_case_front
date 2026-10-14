"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";

/** Revalidates every cached request of one group (and the home list), after any mutation. */
export function useRefreshGroup(groupId: number) {
  const { mutate } = useSWRConfig();
  return useCallback(() => {
    const base = `/groups/${groupId}`;
    return mutate(
      (key) => typeof key === "string" && (key === "/groups" || key === base || key.startsWith(`${base}/`)),
    );
  }, [groupId, mutate]);
}

/** "2026-10-10" → "10/10/2026" without going through a timezone; full timestamps use local time. */
export function formatDate(isoDay: string): string {
  if (isoDay.length > 10) return formatTimestamp(isoDay);
  const [y, m, d] = isoDay.split("-");
  return `${d}/${m}/${y}`;
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function today(): string {
  const now = new Date();
  const off = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - off).toISOString().slice(0, 10);
}

/** ISO timestamp → local "10/10/2026". */
export const formatTimestamp = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
