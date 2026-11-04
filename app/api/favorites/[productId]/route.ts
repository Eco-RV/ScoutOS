import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Removes a favorite. Removing one that is already gone is not an error. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const productId = Number((await params).productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Laptop no válida" }, { status: 400 });
  }
  await prisma.favorite.deleteMany({ where: { productId } });
  return new NextResponse(null, { status: 204 });
}
