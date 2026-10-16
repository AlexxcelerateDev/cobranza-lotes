// Motor de planes de pago para lotes en abonos. Montos en pesos; meses contados desde la firma.
// Lo usan la calculadora en el navegador y el build: las fechas van en UTC para que den lo mismo.

export interface Fila {
  mes: number;
  /** `YYYY-MM-DD` */
  fecha: string;
  tipo: "enganche" | "mensualidad" | "anualidad" | "final";
  concepto: string;
  monto: number;
  capital: number;
  interes: number;
  saldo: number;
}

export interface Plan {
  precio: number;
  enganche?: number;
  meses: number;
  /** Firma del contrato, `YYYY-MM-DD`. */
  firma?: string;
  /** Se pagan en los meses 12, 24, … */
  anualidades?: { n: number; monto: number };
  /** Mensualidad fija × `nMens`: lo que falte es el saldo final del mes `meses`. Ignora `final`, `msi` y `tasa`. */
  mensualidad?: number;
  nMens?: number;
  /** Sin mensualidad fija: pago final (o contra escritura) en el mes `meses`. */
  final?: number;
  /** Los primeros `msi` meses van sin intereses; el resto se amortiza a `tasa` mensual (francés). */
  msi?: number;
  tasa?: number;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Fecha `k` meses después de `firma`. Un día 31 cae en el último día de los meses más cortos. */
export function fechaMes(firma: string, k: number): string {
  const f = new Date(firma); // `YYYY-MM-DD` se lee como medianoche UTC
  const y = f.getUTCFullYear();
  const m = f.getUTCMonth() + k;
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(f.getUTCDate(), ultimo)))
    .toISOString()
    .slice(0, 10);
}

/**
 * Calendario de pagos. Las mensualidades se redondean a pesos y la última absorbe la diferencia;
 * los intereses corren solo sobre el saldo de las mensualidades.
 */
export function plan(p: Plan): Fila[] {
  const { precio, enganche = 0, meses, firma = "2026-01-10" } = p;
  const an = p.anualidades ?? { n: 0, monto: 0 };
  const fija = p.mensualidad;
  const nMens = fija === undefined ? meses : (p.nMens ?? meses);
  const final =
    fija === undefined
      ? (p.final ?? 0)
      : r2(precio - enganche - an.n * an.monto - nMens * fija);
  if (final < -0.005) throw new Error("Los pagos suman más que el precio");
  const msi = fija === undefined ? Math.min(p.msi ?? meses, meses) : meses;
  const tasa = fija === undefined ? (p.tasa ?? 0) : 0;

  let fin = r2(precio - enganche - an.n * an.monto - final); // lo que cubren las mensualidades
  if (fin < -0.005)
    throw new Error(
      "El enganche, las anualidades y el pago final suman más que el precio",
    );
  const cuotaMsi = fija ?? Math.round(fin / meses);
  let cuotaTasa = 0;

  const filas: Fila[] = [];
  let saldo = precio;
  const pagar = (
    mes: number,
    tipo: Fila["tipo"],
    concepto: string,
    capital: number,
    interes = 0,
  ) => {
    saldo = r2(saldo - capital);
    filas.push({
      mes,
      fecha: fechaMes(firma, mes),
      tipo,
      concepto,
      monto: r2(capital + interes),
      capital: r2(capital),
      interes: r2(interes),
      saldo,
    });
  };

  if (enganche) pagar(0, "enganche", "Enganche", enganche);
  for (let k = 1; k <= meses; k++) {
    if (k <= nMens) {
      if (k === msi + 1) {
        const n = meses - msi;
        cuotaTasa = Math.round(
          tasa ? (fin * tasa) / (1 - (1 + tasa) ** -n) : fin / n,
        );
      }
      const interes = k > msi ? r2(fin * tasa) : 0;
      const ultima = fija === undefined && k === meses;
      const capital = ultima
        ? fin
        : Math.min(fin, k > msi ? cuotaTasa - interes : cuotaMsi);
      fin = r2(fin - capital);
      pagar(k, "mensualidad", `Mensualidad ${k} de ${nMens}`, capital, interes);
    }
    if (k % 12 === 0 && k / 12 <= an.n)
      pagar(k, "anualidad", `Anualidad ${k / 12} de ${an.n}`, an.monto);
    if (k === meses && final > 0.005)
      pagar(
        k,
        "final",
        fija === undefined ? "Pago final" : "Saldo final",
        final,
      );
  }
  return filas;
}

const sumar = (filas: Fila[]) => r2(filas.reduce((s, f) => s + f.monto, 0));

/** El primer pago con el que lo pagado en 6 meses alcanza `umbral`, o `null` si nunca llega. */
export function cruce(
  filas: Fila[],
  umbral: number,
): { fila: Fila; suma: number } | null {
  for (const [i, fila] of filas.entries()) {
    const suma = sumar(
      filas.slice(0, i + 1).filter((g) => g.mes >= fila.mes - 5),
    );
    if (suma >= umbral) return { fila, suma };
  }
  return null;
}

/** La mayor suma de pagos en 6 meses que terminan en algún pago. */
export function ventanaMax(filas: Fila[]): {
  monto: number;
  desde: number;
  hasta: number;
} {
  let monto = 0;
  let hasta = 0;
  for (const f of filas) {
    const suma = sumar(
      filas.filter((g) => g.mes >= f.mes - 5 && g.mes <= f.mes),
    );
    if (suma > monto) [monto, hasta] = [suma, f.mes];
  }
  return { monto, desde: Math.max(0, hasta - 5), hasta };
}
