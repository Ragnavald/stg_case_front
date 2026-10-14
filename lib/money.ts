/**
 * Client-side money helpers. Values are decimal strings end to end; the only math done
 * here is the live split preview, which mirrors the API (integer minor units + largest
 * remainder) so what the user sees is exactly what gets stored.
 */

export const EXPONENTS: Record<string, number> = {
  BRL: 2, USD: 2, EUR: 2, GBP: 2, ARS: 2, CLP: 0, JPY: 0, KWD: 3, BHD: 3,
};

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: string, currency: string): string {
  let f = formatters.get(currency);
  if (!f) {
    const digits = EXPONENTS[currency] ?? 2;
    f = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(currency, f);
  }
  return f.format(value as Intl.StringNumericLiteral);
}

/**
 * Accepts what a Brazilian user types ("1.234,56", "100,5", "100.50") and returns the
 * API format ("1234.56"). Returns null when it is not a number.
 */
export function normalizeDecimal(input: string): string | null {
  let text = input.trim().replace(/\s/g, "");
  if (text === "") return null;
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? text : null;
}

/** Parses a normalized decimal into an integer scaled by 10^scale, or null if too precise. */
export function toScaled(value: string, scale: number): bigint | null {
  const [int = "0", frac = ""] = value.split(".");
  if (frac.length > scale) return null;
  return BigInt(int) * 10n ** BigInt(scale) + BigInt(frac.padEnd(scale, "0") || "0");
}

export function fromScaled(value: bigint, scale: number): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const base = 10n ** BigInt(scale);
  const frac = scale > 0 ? "." + (abs % base).toString().padStart(scale, "0") : "";
  return `${neg ? "-" : ""}${abs / base}${frac}`;
}

/** Same algorithm as the API: largest remainder, ties to the lowest userId. */
export function largestRemainder(total: bigint, weights: { userId: number; weight: bigint }[]): Map<number, bigint> {
  const sum = weights.reduce((a, w) => a + w.weight, 0n);
  const out = new Map<number, bigint>();
  if (sum <= 0n) return out;
  const rows = weights.map((w) => ({
    userId: w.userId,
    share: (total * w.weight) / sum,
    rem: (total * w.weight) % sum,
  }));
  let left = total - rows.reduce((a, r) => a + r.share, 0n);
  for (const r of [...rows].sort((a, b) => (a.rem === b.rem ? a.userId - b.userId : a.rem > b.rem ? -1 : 1))) {
    if (left === 0n) break;
    r.share += 1n;
    left -= 1n;
  }
  for (const r of rows) out.set(r.userId, r.share);
  return out;
}

export const isNegative = (v: string) => v.startsWith("-");
export const isZero = (v: string) => /^-?0+(\.0+)?$/.test(v);
export const abs = (v: string) => (isNegative(v) ? v.slice(1) : v);
