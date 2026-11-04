export interface HistoryPoint {
  price: number;
  capturedAt: Date;
}

export interface PriceDrop {
  first: number;
  firstAt: Date;
  current: number;
  amount: number;
  pct: number;
}

/**
 * Drop since the first price we recorded. Needs at least two records: one import is not a history.
 * `history` must be ordered oldest first.
 */
export function priceDropSince(history: HistoryPoint[], current: number): PriceDrop | null {
  if (history.length < 2) return null;
  const first = history[0];
  if (first.price <= current) return null;
  return {
    first: first.price,
    firstAt: first.capturedAt,
    current,
    amount: first.price - current,
    pct: Math.round((1 - current / first.price) * 100),
  };
}
