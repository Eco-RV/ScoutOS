import { decodeEntities, getJson, MAX_PRODUCTS, REQUEST_DELAY_MS, sleep, stripHtml } from "./http";
import type { Adapter, ScrapedProduct, ScrapeResult, SourceType } from "./types";

// Shape of the public Store API: /wp-json/wc/store/v1/products
interface WooProduct {
  id: number;
  name: string;
  permalink: string;
  short_description: string;
  description: string;
  is_in_stock: boolean;
  images: { src: string }[];
  categories: { name: string }[];
  brands?: { name: string }[];
  attributes: { name: string; terms: { name: string }[] }[];
  prices: {
    price: string;
    regular_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
}

const PAGE_SIZE = 100;

/** "Procesador: Core i5" style lines from the short description's bullet list. */
function specsFromBullets(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const li of html.match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? []) {
    const m = stripHtml(li).match(/^[^\p{L}]*([\p{L} ]{2,40}):\s*(.+)$/u);
    if (m) specs[m[1].trim()] = m[2].trim();
  }
  return specs;
}

function toProduct(p: WooProduct): ScrapedProduct | null {
  const scale = 10 ** p.prices.currency_minor_unit;
  const price = Number(p.prices.price) / scale;
  if (!price) return null;
  const regular = Number(p.prices.regular_price) / scale;

  const specs = specsFromBullets(p.short_description);
  for (const a of p.attributes) specs[a.name] = a.terms.map((t) => t.name).join(", ");
  if (!Object.keys(specs).length) specs["Descripción"] = stripHtml(p.description).slice(0, 1000);

  return {
    externalId: String(p.id),
    url: p.permalink,
    title: decodeEntities(p.name),
    brand: p.brands?.[0]?.name,
    image: p.images[0]?.src,
    price,
    listPrice: regular > price ? regular : undefined,
    currency: p.prices.currency_code,
    inStock: p.is_in_stock,
    categories: p.categories.map((c) => decodeEntities(c.name)),
    specs,
  };
}

/** Map a storefront URL to Store API filters. */
function filtersFor(url: URL): { type: SourceType; params: URLSearchParams } {
  const seg = url.pathname.split("/").filter(Boolean);
  const params = new URLSearchParams();
  const last = seg.at(-1) ?? "";

  if (seg[0] === "producto" || seg[0] === "product") {
    params.set("slug", last);
    return { type: "product", params };
  }
  if (seg[0] === "categoria-producto" || seg[0] === "product-category") {
    params.set("category", last);
  } else if (seg[0] === "marca" || seg[0] === "brand") {
    params.set("brand", last);
  } else if (url.searchParams.get("s")) {
    params.set("search", url.searchParams.get("s")!);
  } else {
    throw new Error(
      "Link no reconocido: usa un producto (/producto/...), una categoría (/categoria-producto/...) o una búsqueda (?s=...)",
    );
  }
  return { type: "listing", params };
}

export const woocommerce: Adapter = {
  async scrape(url: URL): Promise<ScrapeResult> {
    const { type, params } = filtersFor(url);
    params.set("per_page", String(PAGE_SIZE));
    const products: ScrapedProduct[] = [];

    for (let page = 1; products.length < MAX_PRODUCTS; page++) {
      params.set("page", String(page));
      const { data, res } = await getJson<WooProduct[]>(
        `${url.origin}/wp-json/wc/store/v1/products?${params}`,
      );
      // Some stores hide categories in the API; fall back to the category in the link.
      const categoryHint = params.get("category")?.replace(/-/g, " ");
      for (const p of data) {
        const sp = toProduct(p);
        if (!sp) continue;
        if (!sp.categories?.length && categoryHint) sp.categories = [categoryHint];
        products.push(sp);
      }
      const totalPages = Number(res.headers.get("x-wp-totalpages") ?? 1);
      if (type === "product" || page >= totalPages) break;
      await sleep(REQUEST_DELAY_MS);
    }
    return { type, products };
  },
};
