import { describe, expect, it } from "vitest";
import { isLaptop, storeForUrl } from ".";

describe("storeForUrl", () => {
  it("recognizes supported stores", () => {
    expect(storeForUrl("https://cr.siman.com/tecnologia/computadoras/laptops").store.id).toBe("siman");
    expect(storeForUrl("https://zentechcr.net/producto/x/").store.id).toBe("zentech");
  });
  it("rejects other stores", () => {
    expect(() => storeForUrl("https://amazon.com/x")).toThrow(/no soportada/);
  });
});

describe("isLaptop", () => {
  it("keeps laptops and drops accessories", () => {
    expect(isLaptop({ title: "Laptop HP 15 Core i5" })).toBe(true);
    expect(isLaptop({ title: "Soporte para laptop de aluminio" })).toBe(false);
    expect(isLaptop({ title: "Memoria Ram Laptop 16GB DDR5" })).toBe(false);
    expect(isLaptop({ title: "HP 15-fc0250la R5-7520U 8GB", categories: ["Laptops"] })).toBe(true);
    expect(isLaptop({ title: "Monitor curvo Samsung - 24 pulgadas", categories: ["/Electrónica/Computación/Laptops/"] })).toBe(false);
    expect(isLaptop({ title: "Tablet Blackview TAB 20 KIDS", categories: ["Laptops"] })).toBe(false);
  });
});
