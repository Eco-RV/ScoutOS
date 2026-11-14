import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "./bookmarklet";

describe("buildBookmarklet", () => {
  const code = (origin: string) => decodeURIComponent(buildBookmarklet(origin).replace(/^javascript:/, ""));

  it("is valid JavaScript once the builder joins its lines", () => {
    // A stray // comment would swallow the rest of the one-line script, so this must parse.
    expect(() => new Function(code("http://localhost:3000"))).not.toThrow();
  });

  it("knows about the Compufax card reader and the WooCommerce path", () => {
    expect(code("http://localhost:3000")).toContain("product-card");
    expect(code("http://localhost:3000")).toContain("/wp-json/wc/store/v1/products");
  });
});
