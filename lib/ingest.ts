import { prisma } from "@/lib/db";
import { isLaptop, storeForUrl, type ScrapedProduct } from "@/lib/scrapers";
import { parseSpecs } from "@/lib/specs/parse";

export interface RunSummary {
  sourceId: number;
  found: number;
  created: number;
  priceChanges: number;
  priceDrops: number;
  error?: string;
}

async function upsertProduct(store: string, sourceId: number, p: ScrapedProduct) {
  const specs = parseSpecs(p.title, p.specs);
  const data = {
    url: p.url,
    title: p.title,
    brand: p.brand ?? p.title.match(/\b(HP|Dell|Lenovo|Asus|Acer|Apple|MSI|Samsung|Huawei|Microsoft|Gigabyte|LG)\b/i)?.[0],
    image: p.image,
    ...specs,
    inStock: p.inStock,
    listPrice: p.listPrice ?? null,
    currency: p.currency,
    sourceId,
  };

  const existing = await prisma.product.findUnique({
    where: { store_externalId: { store, externalId: p.externalId } },
  });

  if (!existing) {
    await prisma.product.create({
      data: {
        ...data,
        store,
        externalId: p.externalId,
        currentPrice: p.price,
        lowestPrice: p.price,
        history: { create: { price: p.price, listPrice: p.listPrice } },
      },
    });
    return { created: true, changed: false, dropped: false };
  }

  const changed = existing.currentPrice !== p.price;
  await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(changed && {
        prevPrice: existing.currentPrice,
        currentPrice: p.price,
        lowestPrice: Math.min(existing.lowestPrice, p.price),
        history: { create: { price: p.price, listPrice: p.listPrice } },
      }),
    },
  });
  return { created: false, changed, dropped: changed && p.price < existing.currentPrice };
}

/** Scrape one source and store what it finds. Errors are saved on the source, not thrown. */
export async function runSource(sourceId: number): Promise<RunSummary> {
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const summary: RunSummary = { sourceId, found: 0, created: 0, priceChanges: 0, priceDrops: 0 };

  try {
    const { store, url } = storeForUrl(source.url);
    const result = await store.adapter.scrape(url);
    // A single-product link is trusted as-is; listings get filtered down to laptops.
    const laptops = result.type === "product" ? result.products : result.products.filter(isLaptop);
    summary.found = laptops.length;

    for (const p of laptops) {
      const r = await upsertProduct(store.id, source.id, p);
      if (r.created) summary.created++;
      if (r.changed) summary.priceChanges++;
      if (r.dropped) summary.priceDrops++;
    }
    await prisma.source.update({
      where: { id: source.id },
      data: { type: result.type, lastRunAt: new Date(), lastError: null, productCount: laptops.length },
    });
  } catch (e) {
    summary.error = e instanceof Error ? e.message : String(e);
    await prisma.source.update({
      where: { id: source.id },
      data: { lastRunAt: new Date(), lastError: summary.error },
    });
  }
  return summary;
}

export async function runAllSources(): Promise<RunSummary[]> {
  const sources = await prisma.source.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  const out: RunSummary[] = [];
  for (const s of sources) out.push(await runSource(s.id));
  return out;
}
