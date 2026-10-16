import { expect, test } from "vitest";
import { cruce, fechaMes, plan, ventanaMax, type Fila } from "./planes";

// Planes publicados en anuncios de Pincali (consultados el 2026-10-15), reproducidos al peso.
const UMBRAL = 8025 * 117.31;
const suma = (filas: Fila[], k: "monto" | "capital" | "interes") =>
  Math.round(filas.reduce((s, f) => s + f[k], 0) * 100) / 100;

test("plan con mensualidad fija deja el resto como saldo final (ZENZA)", () => {
  const f = plan({
    precio: 629255,
    enganche: 19499,
    meses: 60,
    anualidades: { n: 4, monto: 19499 },
    mensualidad: 5499,
    nMens: 54,
  });
  const ultima = f.at(-1);
  expect(f).toHaveLength(60);
  expect([ultima?.concepto, ultima?.mes, ultima?.monto, ultima?.saldo]).toEqual(
    ["Saldo final", 60, 234814, 0],
  );
  expect(suma(f, "capital")).toBe(629255);
});

test("plan sin intereses con enganche alto cruza el umbral con la primera mensualidad", () => {
  // Residencial Ventanas: 300 m² a $8,500, 35 % de enganche y 12 meses sin intereses.
  const f = plan({ precio: 2550000, enganche: 892500, meses: 12 });
  expect(f.slice(1).map((x) => x.monto)).toEqual(Array(12).fill(138125));
  expect(suma(f, "monto")).toBe(2550000);
  expect(cruce(f, UMBRAL)?.fila.mes).toBe(1); // $1,030,625 en el mismo semestre
});

test("plan amortiza con interés después de los meses sin intereses", () => {
  // Esquema tipo Canto de Sal: 30 % de enganche, 6 meses sin intereses y luego 1 % mensual.
  const f = plan({
    precio: 300000,
    enganche: 90000,
    meses: 24,
    msi: 6,
    tasa: 0.01,
  });
  expect(f.slice(1, 7).every((x) => x.monto === 8750 && x.interes === 0)).toBe(
    true,
  );
  expect(f.slice(7, 24).every((x) => x.monto === 9605)).toBe(true);
  expect(suma(f, "capital")).toBe(300000);
  expect(f.at(-1)?.saldo).toBe(0);
  const intereses = suma(f, "interes");
  expect(intereses > 15300 && intereses < 15450, String(intereses)).toBe(true);
});

test("las mensualidades normales no cruzan el umbral; un pago de contado sí", () => {
  const f = plan({ precio: 450000, enganche: 90000, meses: 36 });
  expect(cruce(f, UMBRAL)).toBeNull();
  expect(ventanaMax(f)).toEqual({ monto: 140000, desde: 0, hasta: 5 }); // enganche + 5 mensualidades
  const contado = plan({ precio: 1200000, enganche: 1200000, meses: 0 });
  expect(cruce(contado, UMBRAL)?.fila.mes).toBe(0);
});

test("plan rechaza pagos que suman más que el precio", () => {
  expect(() => plan({ precio: 100000, enganche: 120000, meses: 12 })).toThrow(
    "suman más que el precio",
  );
});

test("fechaMes lleva el día 31 al último día de los meses cortos", () => {
  for (const [firma, k, esperada] of [
    ["2026-01-31", 1, "2026-02-28"],
    ["2026-01-31", 2, "2026-03-31"],
    ["2027-12-31", 2, "2028-02-29"],
    ["2026-11-10", 2, "2027-01-10"],
    ["2026-03-31", -1, "2026-02-28"],
  ] as const) {
    expect(fechaMes(firma, k), `${firma} + ${k}`).toBe(esperada);
  }
});
