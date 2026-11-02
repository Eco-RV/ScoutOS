import type { Prisma } from "@prisma/client";

/**
 * Text search shared by the home page and the navbar's live suggestions.
 * Every word must match somewhere (title, brand, CPU or GPU): "dell 16gb rtx" finds Dell laptops with 16 GB and an RTX card.
 */
export function textWhere(q: string | undefined): Prisma.ProductWhereInput | undefined {
  const tokens = (q ?? "").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  return {
    AND: tokens.map((t) => ({
      OR: [{ title: { contains: t } }, { brand: { contains: t } }, { cpu: { contains: t } }, { gpu: { contains: t } }],
    })),
  };
}
