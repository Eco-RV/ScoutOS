export type Condition = "nueva" | "usada";

// Condition comes from the title and the store's URL path, not the brand: the brand text
// is rewritten on every scrape, and the title is where stores say "Usada".
const USED = /\busad[ao]s?\b|recertific|reacondicion/i;

export function conditionOf(title: string, sourceUrl?: string | null): Condition {
  return USED.test(title) || (sourceUrl != null && USED.test(sourceUrl)) ? "usada" : "nueva";
}

// Dedicated cards only. Radeon 610M/680M/840M and Intel Arc are integrated graphics.
const DEDICATED = /RTX|GTX|GeForce|Quadro|\bRX\s?\d/i;

export function hasDedicatedGpu(gpu?: string | null): boolean {
  return !!gpu && DEDICATED.test(gpu);
}

export const SCREEN_RANGES = {
  small: { label: 'Hasta 14"', range: { lte: 14.5 } },
  mid: { label: '15" a 16"', range: { gte: 14.9, lte: 16.5 } },
  large: { label: '17" o más', range: { gte: 16.6 } },
} as const;

export type ScreenBucket = keyof typeof SCREEN_RANGES;

export function isScreenBucket(v: string | undefined): v is ScreenBucket {
  return v === "small" || v === "mid" || v === "large";
}
