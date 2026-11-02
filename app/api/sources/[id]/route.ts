import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Turns Prisma's "record not found" into a 404; rethrows anything else. */
function notFound(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  }
  throw e;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  const body = (await req.json().catch(() => null)) as { active?: unknown } | null;
  if (id === null || typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const source = await prisma.source.update({ where: { id }, data: { active: body.active } });
    return NextResponse.json(source);
  } catch (e) {
    return notFound(e);
  }
}

/** Removes the link; its products and price history stay. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  try {
    await prisma.source.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return notFound(e);
  }
}
