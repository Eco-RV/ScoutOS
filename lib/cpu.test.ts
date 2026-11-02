import { describe, expect, it } from "vitest";
import { parseCpu } from "./cpu";

describe("parseCpu", () => {
  it.each([
    ["Core i7-13620H", "Intel", "Intel 13.ª gen"],
    ["Core I5-13420H", "Intel", "Intel 13.ª gen"],
    ["CORE i5 6200U", "Intel", "Intel 6.ª gen"],
    ["Core i7 1165G7", "Intel", "Intel 11.ª gen"],
    ["i5 1145G7", "Intel", "Intel 11.ª gen"],
    ["Core i5 1335U", "Intel", "Intel 13.ª gen"],
    ["Core i7 1260P", "Intel", "Intel 12.ª gen"],
    ["Core i5 10210U", "Intel", "Intel 10.ª gen"],
    ["Core i7-10510U", "Intel", "Intel 10.ª gen"],
    ["Core i7 8565U", "Intel", "Intel 8.ª gen"],
    ["Core i9 12900H", "Intel", "Intel 12.ª gen"],
    ["Core i7 14650HX", "Intel", "Intel 14.ª gen"],
    ["Core Ultra 5 225H", "Intel", "Intel Core Ultra 2"],
    ["Core Ultra 7 150U", "Intel", "Intel Core Ultra 1"],
    ["Core Ultra 7 356H", "Intel", "Intel Core Ultra 3"],
    ["Core i5 210H", "Intel", "Intel Core serie 2"],
    ["Core 7 240H", "Intel", "Intel Core serie 2"],
    ["Intel i3 N305", "Intel", "Intel N-series"],
    ["Core 3 N355", "Intel", "Intel N-series"],
    ["Core i5", "Intel", null],
    ["Ci5", "Intel", null],
    ["Ryzen 5 7520U", "AMD", "AMD Ryzen 7000"],
    ["Ryzen 7 5800H", "AMD", "AMD Ryzen 5000"],
    ["R7-7735HS", "AMD", "AMD Ryzen 7000"],
    ["Ryzen 9 8940HX", "AMD", "AMD Ryzen 8000"],
    ["Ryzen 3 3250U", "AMD", "AMD Ryzen 3000"],
    ["RYZEN AI 5 340", "AMD", "AMD Ryzen AI 300"],
    ["Ryzen Ai 7 350", "AMD", "AMD Ryzen AI 300"],
    ["Ryzen 5", "AMD", null],
    ["AMD 3020e", "AMD", null],
    ["Apple M2", "Apple", "Apple M2"],
    ["A18 Pro", "Apple", "Apple A-series"],
    ["Snapdragon X Elite", "Qualcomm", "Snapdragon X"],
  ])("%s → %s / %s", (cpu, brand, gen) => {
    expect(parseCpu(cpu)).toEqual({ cpuBrand: brand, cpuGen: gen });
  });

  it("returns nothing for missing or unknown CPUs", () => {
    expect(parseCpu(null)).toEqual({ cpuBrand: null, cpuGen: null });
    expect(parseCpu("MediaTek Kompanio 520")).toEqual({ cpuBrand: null, cpuGen: null });
  });
});
