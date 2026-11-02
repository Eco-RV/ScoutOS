import { describe, expect, it } from "vitest";
import { buildComparisonPrompt, type ComparableProduct } from "./comparison";

const base: ComparableProduct = {
  title: "Lenovo IdeaPad 15",
  store: "zentech",
  url: "https://zentechcr.net/producto/ideapad",
  brand: "LENOVO",
  currentPrice: 450000,
  listPrice: null,
  lowestPrice: 430000,
  cpu: "Ryzen 5",
  ramGb: 16,
  storageGb: 1024,
  storageType: "SSD",
  screenIn: 15.6,
  gpu: null,
  inStock: true,
};

describe("buildComparisonPrompt", () => {
  it("lists each laptop with its specs and link", () => {
    const prompt = buildComparisonPrompt([base]);
    expect(prompt).toContain("Laptop 1: Lenovo IdeaPad 15");
    expect(prompt).toContain("- Marca: Lenovo");
    expect(prompt).toContain("- Almacenamiento: 1 TB SSD");
    expect(prompt).toContain("- Pantalla: 15.6 pulgadas");
    expect(prompt).toContain("- Enlace: https://zentechcr.net/producto/ideapad");
  });

  it("marks missing values as not available instead of leaving blanks", () => {
    const prompt = buildComparisonPrompt([{ ...base, gpu: null, listPrice: null }]);
    expect(prompt).toContain("- Gráficos: no disponible");
    expect(prompt).toContain("- Precio de lista: no disponible");
  });

  it("numbers every laptop in order", () => {
    const prompt = buildComparisonPrompt([base, { ...base, title: "HP Pavilion" }]);
    expect(prompt).toContain("Laptop 2: HP Pavilion");
  });
});
