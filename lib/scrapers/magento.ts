import * as cheerio from "cheerio";
import { getText, MAX_PRODUCTS, REQUEST_DELAY_MS, sleep } from "./http";
import type { Adapter, ScrapedProduct, ScrapeResult } from "./types";

type Root = ReturnType<typeof cheerio.load>;
type Sel = ReturnType<Root>;

function priceOf(box: Sel, kind: "finalPrice" | "oldPrice"): number | undefined {
  const raw = box.find(`[data-price-type="${kind}"]`).first().attr("data-price-amount");
  return raw ? Number(raw) : undefined;
}

export function parseListing(html: string): ScrapedProduct[] {
  const $ = cheerio.load(html);
  const out: ScrapedProduct[] = [];
  // Listing cards carry no category, so use the page heading ("Laptops").
  const pageTitle = $("h1.page-title").text().trim();
  $(".product-item-info").each((_, el) => {
    const card = $(el);
    const link = card.find("a.product-item-link").first();
    const box = card.find("[data-role=priceBox]").first();
    const price = priceOf(box, "finalPrice");
    const href = link.attr("href");
    if (!href || !price) return;
    const old = priceOf(box, "oldPrice");
    const img = card.find("img.product-image-photo").first();
    out.push({
      externalId: box.attr("data-product-id") ?? href,
      url: href,
      title: link.text().trim(),
      image: img.attr("data-src") ?? img.attr("src"),
      price,
      listPrice: old && old > price ? old : undefined,
      currency: "CRC",
      inStock: card.find(".stock.unavailable").length === 0,
      categories: pageTitle ? [pageTitle] : [],
      specs: {},
    });
  });
  return out;
}

export function parseProductPage(html: string, url: string): ScrapedProduct | null {
  const $ = cheerio.load(html);
  const main = $(".product-info-main");
  const box = main.find("[data-role=priceBox]").first();
  const price = priceOf(box, "finalPrice");
  if (!price) return null;
  const old = priceOf(box, "oldPrice");

  const specs: Record<string, string> = {};
  $("#product-attribute-specs-table tr").each((_, tr) => {
    const label = $(tr).find("th").text().trim();
    const value = $(tr).find("td").text().trim();
    if (label && value) specs[label] = value;
  });

  const image =
    html.match(/"full":"([^"]+)"/)?.[1]?.replace(/\\\//g, "/") ??
    $(".gallery-placeholder img").first().attr("src");

  return {
    externalId: box.attr("data-product-id") ?? $("input[name=product]").attr("value") ?? url,
    url,
    title: $("h1.page-title").text().trim(),
    brand: specs["Marca"],
    image,
    price,
    listPrice: old && old > price ? old : undefined,
    currency: "CRC",
    inStock: !main.find(".stock.unavailable").length,
    specs,
  };
}

export const magento: Adapter = {
  async scrape(url: URL): Promise<ScrapeResult> {
    const first = await getText(url.href);
    if (/<body[^>]*class="[^"]*catalog-product-view/.test(first)) {
      const p = parseProductPage(first, url.href);
      return { type: "product", products: p ? [p] : [] };
    }

    const seen = new Map<string, ScrapedProduct>();
    let html = first;
    for (let page = 1; seen.size < MAX_PRODUCTS; page++) {
      const items = parseListing(html).filter((p) => !seen.has(p.externalId));
      if (!items.length) break; // past the last page
      items.forEach((p) => seen.set(p.externalId, p));
      await sleep(REQUEST_DELAY_MS);
      const next = new URL(url);
      next.searchParams.set("p", String(page + 1));
      html = await getText(next.href);
    }
    return { type: "listing", products: [...seen.values()] };
  },
};
