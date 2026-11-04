import { describe, expect, it } from "vitest";
import { brandKey, canonicalBrand } from "./brands";

describe("brands", () => {
  it("groups the same brand written in different cases", () => {
    expect(brandKey("LENOVO")).toBe(brandKey("Lenovo"));
    expect(brandKey(" lenovo ")).toBe("lenovo");
  });

  it("uses the official casing for known brands", () => {
    expect(canonicalBrand("LENOVO")).toBe("Lenovo");
    expect(canonicalBrand("hp")).toBe("HP");
    expect(canonicalBrand("asus")).toBe("ASUS");
  });

  it("capitalizes unknown brands", () => {
    expect(canonicalBrand("ACEMAGIC")).toBe("Acemagic");
  });
});

describe("brand cleanup", () => {
  it("drops the used-laptop wording the stores add", () => {
    expect(canonicalBrand("Laptops usadas dell")).toBe("Dell");
    expect(canonicalBrand("Laptops usadas lenovo")).toBe("Lenovo");
    expect(brandKey("Laptops usadas hp")).toBe(brandKey("HP"));
  });

  it("finds a known brand inside a dirty label", () => {
    expect(canonicalBrand("Cpumini usadas hp")).toBe("HP");
    expect(canonicalBrand("GIGABYTE")).toBe("Gigabyte");
  });
});
