import { expect, test } from "vitest";
import { calcular, ESQUEMAS, FIRMA, UMA, type Entrada } from "./calculadora";

const entrada = (i: number): Entrada => {
  const esquema = ESQUEMAS[i];
  if (!esquema) throw new Error(`No hay esquema ${i}`);
  return { ...esquema.valores, firma: FIRMA, uma: UMA };
};

test("calcular resume cada esquema de ejemplo", () => {
  for (const [i, mensualidad, nota, alcanza] of [
    [0, "$10,000", "36 pagos", false],
    [1, "$138,125", "12 pagos", true],
    [2, "$8,750", "los primeros 6 meses; luego $9,605", false],
    [3, "$5,499", "54 pagos", false],
    [4, "$25,000", "24 pagos", true],
  ] as const) {
    const r = calcular(entrada(i));
    expect(
      [r.mensualidad, r.mensualidadNota, r.cruce !== null],
      `esquema ${i}`,
    ).toEqual([mensualidad, nota, alcanza]);
  }
});

test("calcular avisa del saldo final del mes 60", () => {
  expect(calcular(entrada(3)).final?.titulo).toBe(
    "Saldo final en el mes 60: $234,814",
  );
});

test("calcular dice con qué pago se alcanza el umbral", () => {
  const r = calcular(entrada(1));
  expect(r.alerta.titulo).toBe(
    "Alcanza el umbral con el pago del 10 dic 2026 (mensualidad 1 de 12)",
  );
  expect(r.proporcion).toBeGreaterThan(1);
});

test("calcular rechaza un enganche mayor que el precio", () => {
  expect(() => calcular({ ...entrada(0), eng: 120 })).toThrow(
    "suman más que el precio",
  );
});
