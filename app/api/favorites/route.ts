import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storeName } from "@/lib/scrapers";

export const runtime = "nodejs";

const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

/** Favorites with the current price and the price we had when they were saved. */
export async function GET() {
  const rows = await prisma.favorite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { id: true, title: true, image: true, store: true, currentPrice: true, inStock: true, brand: true },
      },
    },
  });
  return NextResponse.json(
    rows.map((f) => ({
      productId: f.productId,
      title: f.product.title,
      image: f.product.image,
      store: f.product.store,
      storeLabel: storeName(f.product.store),
      inStock: f.product.inStock,
      currentPrice: f.product.currentPrice,
      priceAtSave: f.priceAtSave,
      savedAt: f.createdAt.toISOString(),
    })),
  );
}

/** Saves a laptop. Saving twice keeps the first save, so a double click is harmless. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { productId?: unknown } | null;
  if (!isId(body?.productId)) {
    return NextResponse.json({ error: "Laptop no válida" }, { status: 400 });
  }
  const product = await prisma.product.findUnique({ where: { id: body.productId }, select: { currentPrice: true } });
  if (!product) {
    return NextResponse.json({ error: "Esa laptop ya no existe" }, { status: 404 });
  }
  await prisma.favorite.upsert({
    where: { productId: body.productId },
    create: { productId: body.productId, priceAtSave: product.currentPrice },
    update: {},
  });
  return NextResponse.json({ productId: body.productId }, { status: 201 });
}
