import { getJson, MAX_PRODUCTS, REQUEST_DELAY_MS, sleep, stripHtml } from "./http";
import type { Adapter, ScrapedProduct, ScrapeResult } from "./types";

// Shape of /api/catalog_system/pub/products/search (only the fields we use).
interface VtexProduct {
  productId: string;
  productName: string;
  brand: string;
  link: string;
  categories: string[];
  allSpecifications?: string[];
  description?: string;
  items: {
    itemId: string;
    images: { imageUrl: string }[];
    sellers: {
      commertialOffer: { Price: number; ListPrice: number; AvailableQuantity: number };
    }[];
  }[];
  [spec: string]: unknown;
}

const PAGE_SIZE = 50;

// Specification fields that are promos/internal flags, not hardware specs.
const IGNORED_SPECS = /MSI|PLP|Vendido|allowlist|Exclusivo|Rebaja|Siman Pro|ACL/i;

function toProduct(p: VtexProduct): ScrapedProduct | null {
  // Pick the cheapest available SKU/seller combination.
  let best: { item: VtexProduct["items"][number]; price: number; list: number; qty: number } | null = null;
  for (const item of p.items) {
    for (const s of item.sellers) {
      const o = s.commertialOffer;
      if (!o.Price) continue;
      const better =
        !best || (o.AvailableQuantity > 0 && (best.qty === 0 || o.Price < best.price));
      if (better) best = { item, price: o.Price, list: o.ListPrice, qty: o.AvailableQuantity };
    }
  }
  if (!best) return null;

  const specs: Record<string, string> = {};
  for (const name of p.allSpecifications ?? []) {
    const v = p[name];
    if (IGNORED_SPECS.test(name) || !Array.isArray(v)) continue;
    specs[name] = v.join(", ");
  }
  if (p.description) specs["Descripción"] = stripHtml(p.description).slice(0, 1000);

  return {
    externalId: p.productId,
    url: p.link,
    title: p.productName,
    brand: p.brand,
    image: best.item.images[0]?.imageUrl,
    price: best.price,
    listPrice: best.list > best.price ? best.list : undefined,
    currency: "CRC",
    inStock: best.qty > 0,
    categories: p.categories,
    specs,
  };
}

/** Turn a store page URL into the matching catalog search API path + query. */
function searchEndpoint(url: URL): { path: string; query: URLSearchParams; type: "product" | "listing" } {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.at(-1) === "p" && segments.length === 2) {
    return { path: `${segments[0]}/p`, query: new URLSearchParams(), type: "product" };
  }
  const query = new URLSearchParams();
  const map = url.searchParams.get("map");
  if (map) query.set("map", map);
  const term = url.searchParams.get("_q") ?? url.searchParams.get("q") ?? url.searchParams.get("ft");
  if (term && !map) query.set("ft", term);
  return { path: segments.join("/"), query, type: "listing" };
}

export const vtex: Adapter = {
  async scrape(url: URL): Promise<ScrapeResult> {
    const { path, query, type } = searchEndpoint(url);
    const base = `${url.origin}/api/catalog_system/pub/products/search/${path}`;
    const products: ScrapedProduct[] = [];

    for (let from = 0; from < MAX_PRODUCTS; from += PAGE_SIZE) {
      query.set("_from", String(from));
      query.set("_to", String(from + PAGE_SIZE - 1));
      const { data, res } = await getJson<VtexProduct[]>(`${base}?${query}`);
      for (const p of data) {
        const sp = toProduct(p);
        if (sp) products.push(sp);
      }
      // "resources: 0-49/123" tells us the total number of results.
      const total = Number(res.headers.get("resources")?.split("/")[1] ?? 0);
      if (type === "product" || data.length < PAGE_SIZE || from + PAGE_SIZE >= total) break;
      await sleep(REQUEST_DELAY_MS);
    }
    return { type, products };
  },
};
