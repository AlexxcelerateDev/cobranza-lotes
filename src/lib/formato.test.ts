import { expect, test } from "vitest";
import { fecha, pesos } from "./formato";

test("fecha no se corre al día anterior al oeste de UTC", () => {
  // `vitest.config.ts` corre los tests en America/Mexico_City (UTC-6).
  expect(fecha("2026-10-16")).toBe("16 oct 2026");
});

test("fecha respeta el límite de año", () => {
  for (const [iso, esperada] of [
    ["2026-01-01", "1 ene 2026"],
    ["2025-12-31", "31 dic 2025"],
  ] as const) {
    expect(fecha(iso), iso).toBe(esperada);
  }
});

test("pesos redondea al peso", () => {
  expect(pesos(8025 * 117.31)).toBe("$941,413");
});
