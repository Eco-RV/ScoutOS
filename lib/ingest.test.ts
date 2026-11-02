import { describe, expect, it } from "vitest";
import { isPriceDrop } from "./ingest";

describe("isPriceDrop", () => {
  it("counts a lower price than the last scrape", () => {
    expect(isPriceDrop({ currentPrice: 500, listPrice: null }, { price: 450 })).toBe(true);
  });

  it("ignores a price increase", () => {
    expect(isPriceDrop({ currentPrice: 450, listPrice: null }, { price: 500 })).toBe(false);
  });

  it("counts entering sale below the store's list price", () => {
    expect(
      isPriceDrop({ currentPrice: 600, listPrice: 600 }, { price: 550, listPrice: 600 }),
    ).toBe(true);
  });

  it("does not count staying on sale again on the next run", () => {
    expect(
      isPriceDrop({ currentPrice: 550, listPrice: 600 }, { price: 550, listPrice: 600 }),
    ).toBe(false);
  });

  it("does not count a product with no list price discount", () => {
    expect(
      isPriceDrop({ currentPrice: 600, listPrice: null }, { price: 600, listPrice: 600 }),
    ).toBe(false);
  });
});
