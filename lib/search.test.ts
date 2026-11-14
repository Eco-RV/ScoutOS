import { describe, expect, it } from "vitest";
import { textWhere } from "./search";

describe("textWhere", () => {
  it("returns nothing for an empty query", () => {
    expect(textWhere("   ")).toBeUndefined();
    expect(textWhere(undefined)).toBeUndefined();
  });

  it("requires every word to match one of the text fields", () => {
    expect(textWhere("dell  16gb rtx")).toEqual({
      AND: [
        { OR: [{ title: { contains: "dell", mode: "insensitive" } }, { brand: { contains: "dell", mode: "insensitive" } }, { cpu: { contains: "dell", mode: "insensitive" } }, { gpu: { contains: "dell", mode: "insensitive" } }] },
        { OR: [{ title: { contains: "16gb", mode: "insensitive" } }, { brand: { contains: "16gb", mode: "insensitive" } }, { cpu: { contains: "16gb", mode: "insensitive" } }, { gpu: { contains: "16gb", mode: "insensitive" } }] },
        { OR: [{ title: { contains: "rtx", mode: "insensitive" } }, { brand: { contains: "rtx", mode: "insensitive" } }, { cpu: { contains: "rtx", mode: "insensitive" } }, { gpu: { contains: "rtx", mode: "insensitive" } }] },
      ],
    });
  });
});
