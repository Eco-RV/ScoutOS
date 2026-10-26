import { describe, expect, it } from "vitest";
import { parseSpecs } from "./parse";

// Real titles taken from the supported stores.
describe("parseSpecs", () => {
  it("Siman: full spec title", () => {
    expect(parseSpecs('Laptop Lenovo IdeaPad Slim 3 15.6" (39.62 cm) AMD Ryzen 5 5625U 16GB RAM 512GB SSD Windows 11 Home Azul')).toEqual({
      cpu: "Ryzen 5 5625U", ramGb: 16, storageGb: 512, storageType: "SSD", screenIn: 15.6, gpu: undefined,
    });
  });

  it("Tienda HP: trademark symbols and TB", () => {
    const s = parseSpecs('Workstation portátil HP ZBook X G1i de 16 pulgadas, 16", Intel® Core™ Ultra 9, 32GB RAM, 1TB SSD');
    expect(s).toMatchObject({ cpu: "Core Ultra 9", ramGb: 32, storageGb: 1024, screenIn: 16 });
  });

  it("Zentech: RAM/storage pair and comma decimal inch", () => {
    const s = parseSpecs("Laptop Usada DELL Latitude 5320 2 en 1 CORE i5 1145G7 16GB/256GB SSD 13,3&#8243; Táctil");
    expect(s).toMatchObject({ cpu: "CORE i5 1145G7", ramGb: 16, storageGb: 256, storageType: "SSD", screenIn: 13.3 });
  });

  it("Extreme Outlet: dash-separated title, type from spec label", () => {
    const s = parseSpecs("HP Laptop 14-fq0037nr – AMD 3020e – 4GB – 64GB – TOUCH", { SSD: "64 GB", Pantalla: "14″" });
    expect(s).toMatchObject({ cpu: "AMD 3020e", ramGb: 4, storageGb: 64, storageType: "SSD", screenIn: 14 });
  });

  it("GPU and the more detailed CPU from the spec table", () => {
    const s = parseSpecs("Laptop Gamer Victus by HP, AMD Ryzen 7, 16 GB RAM, NVIDIA GeForce RTX 4050, 512 GB SSD", {
      Procesador: "AMD Ryzen 7 7445HS",
    });
    expect(s).toMatchObject({ cpu: "Ryzen 7 7445HS", gpu: "GeForce RTX 4050", ramGb: 16 });
  });
});
