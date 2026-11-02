export type RawParams = Record<string, string | string[] | undefined>;

/**
 * Link to the home page with the current filters, changed by `changes`.
 * A null change removes that param; an array value keeps repeated params (?brand=a&brand=b).
 */
export function hrefWith(raw: RawParams, changes: Record<string, string | string[] | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...raw, ...changes })) {
    if (v == null) continue;
    for (const x of ([] as string[]).concat(v)) if (x) p.append(k, x);
  }
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

/** Values of one param, whether it came as a single value or a repeated one. */
export const valuesOf = (raw: RawParams, key: string): string[] => ([] as string[]).concat(raw[key] ?? []).filter(Boolean);
