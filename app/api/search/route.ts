import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { textWhere } from "@/lib/search";
import { storeName } from "@/lib/scrapers";

export const runtime = "nodejs";

/** Live suggestions for the navbar: the cheapest matches, a handful at a time. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const rows = await prisma.product.findMany({
    where: textWhere(q),
    orderBy: { currentPrice: "asc" },
    take: 6,
    select: { id: true, title: true, image: true, store: true, currentPrice: true },
  });
  return NextResponse.json(rows.map((r) => ({ ...r, storeLabel: storeName(r.store) })));
}
