import { describe, expect, it } from "vitest";
import { priceDropSince } from "./history";

const at = (d: string) => new Date(d);

describe("priceDropSince", () => {
  it("measures the drop from the first recorded price", () => {
    const drop = priceDropSince(
      [
        { price: 389000, capturedAt: at("2026-10-01") },
        { price: 359000, capturedAt: at("2026-10-20") },
      ],
      359000,
    );
    expect(drop).toMatchObject({ first: 389000, current: 359000, amount: 30000, pct: 8 });
    expect(drop?.firstAt).toEqual(at("2026-10-01"));
  });

  it("needs two records", () => {
    expect(priceDropSince([{ price: 100, capturedAt: at("2026-10-01") }], 90)).toBeNull();
  });

  it("is null when the price went up or stayed", () => {
    const h = [
      { price: 100, capturedAt: at("2026-10-01") },
      { price: 120, capturedAt: at("2026-10-20") },
    ];
    expect(priceDropSince(h, 120)).toBeNull();
  });
});
