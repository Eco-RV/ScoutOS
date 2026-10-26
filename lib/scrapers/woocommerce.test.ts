import { describe, expect, it } from "vitest";
import { parseSpecs } from "@/lib/specs/parse";
import fixture from "./__fixtures__/extremetech-store-api.json";
import { fromStoreApi, type WooProduct } from "./woocommerce";

// Real Store API products captured from ExtremeTech through the bookmarklet.
describe("fromStoreApi", () => {
  const url = new URL("https://extremetechcr.com/product-category/computadoras/laptops/laptops-laptops/");
  const { type, products } = fromStoreApi(url, fixture as WooProduct[]);

  it("reads a category listing", () => {
    expect(type).toBe("listing");
    expect(products).toHaveLength(3);
  });

  it("keeps the detailed bullet spec over the coarse attribute and takes the brand attribute", () => {
    const asus = products[0];
    expect(asus.brand).toBe("ASUS");
    expect(asus.title).toContain("AMD Ryzen 9 8940HX –");
    expect(parseSpecs(asus.title, asus.specs)).toMatchObject({
      cpu: "Ryzen 9 8940HX", ramGb: 16, storageGb: 1024, screenIn: 16, gpu: "RTX 5070",
    });
  });

  it("reports the store's sale price", () => {
    expect(products[1]).toMatchObject({ price: 759000, listPrice: 799000 });
    expect(products[2].listPrice).toBeUndefined();
  });
});
