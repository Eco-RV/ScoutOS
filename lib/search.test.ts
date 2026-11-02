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
        { OR: [{ title: { contains: "dell" } }, { brand: { contains: "dell" } }, { cpu: { contains: "dell" } }, { gpu: { contains: "dell" } }] },
        { OR: [{ title: { contains: "16gb" } }, { brand: { contains: "16gb" } }, { cpu: { contains: "16gb" } }, { gpu: { contains: "16gb" } }] },
        { OR: [{ title: { contains: "rtx" } }, { brand: { contains: "rtx" } }, { cpu: { contains: "rtx" } }, { gpu: { contains: "rtx" } }] },
      ],
    });
  });
});
