import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Saves (or clears) the answer pasted from the AI. */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { aiResult?: unknown } | null;
  const aiResult = typeof body?.aiResult === "string" ? body.aiResult.trim() || null : undefined;
  if (!Number.isInteger(id) || id <= 0 || aiResult === undefined) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const comparison = await prisma.comparison.update({ where: { id }, data: { aiResult } });
    return NextResponse.json(comparison);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Comparación no encontrada" }, { status: 404 });
    }
    throw e;
  }
}
