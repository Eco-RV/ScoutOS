import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveResult } from "@/lib/ingest";
import { storeForUrl } from "@/lib/scrapers";
import { fromStoreApi, woocommerce, type WooProduct } from "@/lib/scrapers/woocommerce";

export const runtime = "nodejs";

/** Same page with different sort/paging params should map to one source. */
function canonical(url: URL) {
  const s = url.searchParams.get("s");
  return `${url.origin}${url.pathname}${s ? `?s=${encodeURIComponent(s)}` : ""}`;
}

/**
 * Receives Store API products that the bookmarklet read in the user's own
 * browser session (for stores that block server requests).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { url?: string; products?: WooProduct[] } | null;
  if (!body?.url || !Array.isArray(body.products)) {
    return NextResponse.json({ error: "Datos de importación inválidos" }, { status: 400 });
  }

  try {
    const { store, url } = storeForUrl(body.url);
    if (store.adapter !== woocommerce) throw new Error(`${store.name} no necesita el marcador: agrega el link en /sources`);

    const result = fromStoreApi(url, body.products);
    const href = canonical(url);
    const source = await prisma.source.upsert({
      where: { url: href },
      create: { url: href, store: store.id, type: result.type },
      update: {},
    });
    const summary = await saveResult(source.id, store.id, result);
    return NextResponse.json({ store: store.name, summary });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
