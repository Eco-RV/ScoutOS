import { describe, expect, it } from "vitest";
import { conditionOf, hasDedicatedGpu } from "./laptop-filters";

describe("conditionOf", () => {
  it("reads used laptops from the title", () => {
    expect(conditionOf("Laptop Usada DELL Latitude 5320 13,3″")).toBe("usada");
  });

  it("reads recertified laptops from the store URL", () => {
    expect(conditionOf("Lenovo ThinkPad T14", "https://cfx-cr.com/computadoras/laptops-recertificadas.html")).toBe("usada");
  });

  it("treats the rest as new", () => {
    expect(conditionOf("Asus TUF Gaming A16 – RTX 5070", "https://zentechcr.net/categoria-producto/laptops-nuevas/")).toBe("nueva");
  });
});

describe("hasDedicatedGpu", () => {
  it("accepts discrete cards", () => {
    expect(hasDedicatedGpu("RTX 4050")).toBe(true);
    expect(hasDedicatedGpu("RTX5090")).toBe(true);
    expect(hasDedicatedGpu("GeForce GTX 1650")).toBe(true);
    expect(hasDedicatedGpu("Radeon RX 6600M")).toBe(true);
  });

  it("rejects integrated graphics and empty values", () => {
    expect(hasDedicatedGpu("Radeon 610M")).toBe(false);
    expect(hasDedicatedGpu("Intel Arc Graphics")).toBe(false);
    expect(hasDedicatedGpu(null)).toBe(false);
  });
});
