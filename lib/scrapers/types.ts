export type SourceType = "product" | "listing";

export interface ScrapedProduct {
  externalId: string;
  url: string;
  title: string;
  brand?: string;
  image?: string;
  price: number;
  listPrice?: number;
  currency: string;
  inStock: boolean;
  /** Category names from the store, used to decide whether it's a laptop. */
  categories?: string[];
  /** Spec label -> value, as the store shows it. */
  specs: Record<string, string>;
}

export interface ScrapeResult {
  type: SourceType;
  products: ScrapedProduct[];
}

export interface Adapter {
  scrape(url: URL): Promise<ScrapeResult>;
}
