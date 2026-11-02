import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

/** Creates a comparison from the selected laptop ids. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { productIds?: unknown } | null;
  const raw = Array.isArray(body?.productIds) ? (body.productIds as unknown[]) : [];
  const ids = [...new Set(raw)];
  if (ids.length < 2 || !ids.every(isId)) {
    return NextResponse.json({ error: "Elige al menos 2 laptops" }, { status: 400 });
  }

  const found = await prisma.product.count({ where: { id: { in: ids as number[] } } });
  if (found !== ids.length) {
    return NextResponse.json({ error: "Alguna laptop ya no existe" }, { status: 400 });
  }

  const name = `Comparación de ${ids.length} laptops · ${new Date().toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })}`;
  const comparison = await prisma.comparison.create({
    data: { name, items: { create: (ids as number[]).map((productId) => ({ productId })) } },
  });
  return NextResponse.json({ id: comparison.id }, { status: 201 });
}
