import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { active } = (await req.json()) as { active: boolean };
  const source = await prisma.source.update({ where: { id: Number(id) }, data: { active } });
  return NextResponse.json(source);
}

/** Removes the link; its products and price history stay. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.source.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
