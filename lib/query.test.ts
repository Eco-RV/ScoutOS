import { describe, expect, it } from "vitest";
import { hrefWith, valuesOf } from "./query";

describe("hrefWith", () => {
  it("keeps the other filters and removes the null ones", () => {
    const raw = { q: "dell", brand: ["dell", "hp"], ram: "16" };
    expect(hrefWith(raw, { ram: null })).toBe("/?q=dell&brand=dell&brand=hp");
  });

  it("returns the bare home page when nothing is left", () => {
    expect(hrefWith({ q: "x" }, { q: null })).toBe("/");
  });

  it("reads repeated values", () => {
    expect(valuesOf({ brand: ["a", "b"] }, "brand")).toEqual(["a", "b"]);
    expect(valuesOf({ brand: "a" }, "brand")).toEqual(["a"]);
  });
});
