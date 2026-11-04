import { describe, expect, it } from "vitest";
import { fromCards } from "./cards";

const page = new URL("https://www.compufaxcr.com/laptop-gaming--59");

describe("fromCards", () => {
  it("keeps well-formed cards and resolves their links", () => {
    const r = fromCards(page, [
      {
        externalId: "1773",
        url: "/laptop-gaming-59/c1773-hp-victus-1773",
        title: "C1773 HP VICTUS NVIDIA 4060 8GB 16GB",
        image: "https://cdn3.alegra.com/x.png",
        price: 699550,
        listPrice: 823000,
        inStock: true,
        categories: ["laptop-gaming"],
      },
    ]);
    expect(r.type).toBe("listing");
    expect(r.products).toHaveLength(1);
    expect(r.products[0]).toMatchObject({
      externalId: "1773",
      url: "https://www.compufaxcr.com/laptop-gaming-59/c1773-hp-victus-1773",
      price: 699550,
      listPrice: 823000,
      currency: "CRC",
      categories: ["laptop-gaming"],
      specs: {},
    });
  });

  it("drops cards without id, title or a usable price", () => {
    const r = fromCards(page, [
      { externalId: "", title: "x", price: 1 },
      { externalId: "2", title: "", price: 1 },
      { externalId: "3", title: "Laptop", price: 0 },
      { externalId: "4", title: "Laptop", price: "abc" },
      null,
    ]);
    expect(r.products).toEqual([]);
  });

  it("ignores a list price that is not above the current price", () => {
    const r = fromCards(page, [{ externalId: "5", title: "Laptop", url: "/p", price: 100, listPrice: 100 }]);
    expect(r.products[0].listPrice).toBeUndefined();
  });
});
