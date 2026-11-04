import type { Adapter, ScrapedProduct, ScrapeResult } from "./types";

/**
 * Stores whose products only appear once their page runs JavaScript (Alegra shops). The bookmarklet
 * reads the rendered product cards in the user's browser and sends them here. The server never fetches these pages.
 */
export const browserCards: Adapter = {
  async scrape() {
    throw new Error("Esta tienda carga sus productos con JavaScript: actualízala con el marcador de /import");
  },
};

const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Validates the cards the bookmarklet sent. Anything malformed is dropped rather than trusted. */
export function fromCards(url: URL, raw: unknown[]): ScrapeResult {
  const products: ScrapedProduct[] = [];
  for (const r of raw) {
    const p = r as Record<string, unknown>;
    if (!p || !isText(p.externalId) || !isText(p.title) || !isNum(p.price) || p.price <= 0) continue;
    const link = typeof p.url === "string" ? p.url : "";
    let productUrl: string;
    try {
      productUrl = new URL(link, url).href;
    } catch {
      continue;
    }
    products.push({
      externalId: p.externalId,
      url: productUrl,
      title: p.title.trim(),
      image: typeof p.image === "string" && p.image ? p.image : undefined,
      price: p.price,
      listPrice: isNum(p.listPrice) && p.listPrice > p.price ? p.listPrice : undefined,
      currency: "CRC",
      inStock: p.inStock !== false,
      categories: Array.isArray(p.categories) ? p.categories.filter(isText) : [],
      specs: {},
    });
  }
  return { type: "listing", products };
}
