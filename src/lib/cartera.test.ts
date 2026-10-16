import { expect, test } from "vitest";
import { UMA, UMBRAL_UMAS } from "./calculadora";
import {
  CLIENTES,
  contratos,
  cuenta,
  HOY,
  maxSeisMeses,
  PRECIO,
  recordatorio,
} from "./cartera";

const buscar = (lote: number) => {
  const venta = contratos().find(({ contrato }) => contrato.lote === lote);
  if (!venta) throw new Error(`No hay contrato del lote ${lote}`);
  return venta;
};

test("cuenta cuadra pagado + saldo con el precio en todos los contratos", () => {
  for (const { contrato } of contratos()) {
    const e = cuenta(contrato, HOY);
    expect(e.pagado + e.saldo, `lote ${contrato.lote}`).toBe(PRECIO);
    expect(e.saldo, `lote ${contrato.lote}`).toBeGreaterThanOrEqual(0);
  }
});

test("cuenta cobra 2 % de moratorio por mes o fracción de atraso", () => {
  // Lote 7: la mensualidad del 10 oct no se pagó; al 15 oct lleva 5 días.
  const e = cuenta(buscar(7).contrato, HOY);
  expect([e.vencidas.length, e.vencido, e.moratorio]).toEqual([1, 10000, 200]);
  expect(e.proxima?.vence).toBe("2026-11-10");
});

test("cuenta marca como pagadas con atraso las que se pagaron después de vencer", () => {
  const e = cuenta(buscar(5).contrato, HOY);
  expect(e.vencido).toBe(0);
  expect(e.cuotas.slice(1, 4).map((q) => q.estatus)).toEqual([
    "tarde",
    "tarde",
    "tarde",
  ]);
});

test("cuenta deja en cero un contrato liquidado antes de plazo", () => {
  const e = cuenta(buscar(10).contrato, HOY);
  expect([e.saldo, e.pagadas, e.proxima]).toEqual([0, 36, undefined]);
});

test("recordatorio cobra lo vencido o recuerda el próximo pago", () => {
  const atrasado = buscar(7);
  expect(
    recordatorio(
      atrasado.cliente,
      atrasado.contrato,
      cuenta(atrasado.contrato, HOY),
      HOY,
    ),
  ).toContain("1 mensualidad vencida por $10,000, más $200 de moratorio");
  const alCorriente = buscar(1);
  expect(
    recordatorio(
      alCorriente.cliente,
      alCorriente.contrato,
      cuenta(alCorriente.contrato, HOY),
      HOY,
    ),
  ).toContain("mensualidad 22 de 36 por $10,000 vence el 10 nov 2026");
});

test("maxSeisMeses suma todos los lotes del cliente dentro de la ventana", () => {
  const umbral = UMA * UMBRAL_UMAS;
  const porNombre = new Map(CLIENTES.map((c) => [c.nombre, maxSeisMeses(c)]));
  expect(porNombre.get("Mariana Chan Dzib")).toBe(140000); // enganche + 5 mensualidades
  expect(
    porNombre.get("Inversiones Península (ejemplo)"),
  ).toBeGreaterThanOrEqual(umbral);
});
