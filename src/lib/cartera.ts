// La cartera ficticia del portal de ejemplo (`/demo/`): Privada Los Cedros, manzana 4, y el estado
// de cuenta de cada contrato. Es una foto al corte `HOY`, no depende del reloj.
import { fecha, pesos } from "./formato";
import { fechaMes } from "./planes";

export const HOY = "2026-10-15";
export const DESARROLLO = "Privada Los Cedros";
export const LOTES = 24;
export const PRECIO = 450_000;
export const MENSUALIDADES = 36;
const ENGANCHE = 0.2;
/** Mensual, sobre cada mensualidad vencida, por mes o fracción de atraso. */
export const MORATORIO = 0.02;
const CUOTA = (PRECIO * (1 - ENGANCHE)) / MENSUALIDADES;
export const CLABE = "000 000 0000 0000 0000";

type Pago = readonly [fecha: string, monto: number];
export interface Contrato {
  lote: number;
  firma: string;
  contado: boolean;
  pagos: Pago[];
}
export interface Cliente {
  nombre: string;
  contratos: Contrato[];
}

const DIA = 86_400_000;
const masDias = (iso: string, n: number) =>
  new Date(Date.parse(iso) + n * DIA).toISOString().slice(0, 10);
export const dias = (desde: string, hasta: string) =>
  Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA);

// Al corriente salvo las últimas `atrasadas` mensualidades, pagando cada una `retraso` días tarde.
function financiado(
  lote: number,
  firma: string,
  { atrasadas = 0, retraso = 0 } = {},
): Contrato {
  const pagos: Pago[] = [[firma, PRECIO * ENGANCHE]];
  for (let k = 1; k <= MENSUALIDADES && fechaMes(firma, k) <= HOY; k++) {
    const f = masDias(fechaMes(firma, k), retraso);
    if (f <= HOY) pagos.push([f, CUOTA]);
  }
  pagos.splice(pagos.length - atrasadas, atrasadas);
  return { lote, firma, contado: false, pagos };
}
const contado = (lote: number, firma: string): Contrato => ({
  lote,
  firma,
  contado: true,
  pagos: [[firma, PRECIO]],
});
const liquidado: Contrato = {
  lote: 10,
  firma: "2025-09-10",
  contado: false,
  pagos: [
    ["2025-09-10", PRECIO * ENGANCHE],
    ...Array.from({ length: 9 }, (_, i): Pago => [
      fechaMes("2025-09-10", i + 1),
      CUOTA,
    ]),
    ["2026-06-20", PRECIO * (1 - ENGANCHE) - 9 * CUOTA],
  ],
};

export const CLIENTES: Cliente[] = [
  { nombre: "Alejandra Ruiz Medina", contratos: [financiado(1, "2025-01-10")] },
  { nombre: "Jorge Canché Uc", contratos: [financiado(2, "2025-02-10")] },
  {
    nombre: "Daniela Ortiz Herrera",
    contratos: [financiado(3, "2025-03-10", { atrasadas: 1 })],
  },
  {
    nombre: "Luis Fernando Pech Cab",
    contratos: [financiado(5, "2025-04-10", { retraso: 3 })],
  },
  {
    nombre: "Patricia Gómez Novelo",
    contratos: [financiado(6, "2025-05-10", { atrasadas: 2 })],
  },
  {
    nombre: "Mariana Chan Dzib",
    contratos: [financiado(7, "2025-07-10", { atrasadas: 1 })],
  },
  { nombre: "Roberto Aguilar Sosa", contratos: [financiado(9, "2025-08-10")] },
  { nombre: "Sofía Herrera Ávila", contratos: [liquidado] },
  { nombre: "Carlos Medina Rosado", contratos: [financiado(13, "2025-10-10")] },
  {
    nombre: "Ana Lucía Ek Tun",
    contratos: [financiado(14, "2025-11-10", { atrasadas: 3 })],
  },
  {
    nombre: "Miguel Ángel Couoh May",
    contratos: [financiado(15, "2026-01-10")],
  },
  {
    nombre: "Verónica Salazar Ríos",
    contratos: [financiado(17, "2026-03-10")],
  },
  {
    nombre: "Inversiones Península (ejemplo)",
    contratos: [
      contado(20, "2026-02-10"),
      contado(21, "2026-02-10"),
      financiado(22, "2026-02-10"),
    ],
  },
];

export const APARTADOS = [
  { lote: 4, hasta: "2026-10-20" },
  { lote: 11, hasta: "2026-10-17" },
  { lote: 18, hasta: "2026-10-12" },
];

export type Estatus = "pagada" | "tarde" | "vencida" | "proxima" | "pendiente";
export interface Cuota {
  num: number;
  concepto: string;
  vence: string;
  importe: number;
  /** Lo que falta por pagar de esta cuota. */
  falta: number;
  pagadaEl: string | null;
  estatus: Estatus;
  moratorio: number;
}
export interface EstadoCuenta {
  cuotas: Cuota[];
  pagado: number;
  saldo: number;
  proxima: Cuota | undefined;
  vencidas: Cuota[];
  vencido: number;
  moratorio: number;
  /** Mensualidades liquidadas (sin contar el enganche). */
  pagadas: number;
}

/** Aplica los pagos en orden de fecha al enganche y a cada mensualidad, y calcula lo vencido al corte `hoy`. */
export function cuenta(c: Contrato, hoy: string): EstadoCuenta {
  const bolsa = c.pagos
    .map(([fecha, monto]) => ({ fecha, monto }))
    .toSorted((a, b) => a.fecha.localeCompare(b.fecha));
  const n = c.contado ? 0 : MENSUALIDADES;
  const cuotas = [
    {
      num: 0,
      concepto: c.contado ? "Pago de contado" : "Enganche",
      vence: c.firma,
      importe: c.contado ? PRECIO : PRECIO * ENGANCHE,
    },
    ...Array.from({ length: n }, (_, i) => ({
      num: i + 1,
      concepto: `Mensualidad ${i + 1} de ${n}`,
      vence: fechaMes(c.firma, i + 1),
      importe: CUOTA,
    })),
  ].map((q): Cuota => {
    let falta = q.importe;
    let pagadaEl: string | null = null;
    for (let p = bolsa[0]; p && falta > 0.005; p = bolsa[0]) {
      const t = Math.min(falta, p.monto);
      falta -= t;
      p.monto -= t;
      pagadaEl = p.fecha;
      if (p.monto < 0.005) bolsa.shift();
    }
    const pagada = falta < 0.005;
    const estatus: Estatus = pagada
      ? (pagadaEl ?? "") > q.vence
        ? "tarde"
        : "pagada"
      : q.vence < hoy
        ? "vencida"
        : "pendiente";
    const moratorio =
      estatus === "vencida"
        ? falta * MORATORIO * Math.ceil(dias(q.vence, hoy) / 30)
        : 0;
    return {
      ...q,
      falta,
      pagadaEl: pagada ? pagadaEl : null,
      estatus,
      moratorio,
    };
  });

  const proxima = cuotas.find((q) => q.estatus === "pendiente");
  if (proxima) proxima.estatus = "proxima";
  const vencidas = cuotas.filter((q) => q.estatus === "vencida");
  const pagado = c.pagos.reduce((s, [, monto]) => s + monto, 0);
  return {
    cuotas,
    pagado,
    saldo: PRECIO - pagado,
    proxima,
    vencidas,
    vencido: vencidas.reduce((s, q) => s + q.falta, 0),
    moratorio: vencidas.reduce((s, q) => s + q.moratorio, 0),
    pagadas: cuotas.filter((q) => q.num > 0 && q.falta < 0.005).length,
  };
}

/** Cada contrato con su cliente, en el orden de `CLIENTES`. */
export const contratos = () =>
  CLIENTES.flatMap((cliente) =>
    cliente.contratos.map((contrato) => ({ cliente, contrato })),
  );

export type TipoLote =
  "vendido" | "atrasado" | "apartado" | "apartado-vencido" | "disponible";

export function estadoLote(
  lote: number,
  hoy: string,
): { tipo: TipoLote; texto: string } {
  const venta = contratos().find(({ contrato }) => contrato.lote === lote);
  if (venta) {
    const atrasado = cuenta(venta.contrato, hoy).vencido > 0;
    return {
      tipo: atrasado ? "atrasado" : "vendido",
      texto: `vendido a ${venta.cliente.nombre}${atrasado ? ", con atraso" : ""}`,
    };
  }
  const apartado = APARTADOS.find((a) => a.lote === lote);
  if (apartado)
    return {
      tipo: apartado.hasta < hoy ? "apartado-vencido" : "apartado",
      texto: `apartado hasta el ${fecha(apartado.hasta)}`,
    };
  return { tipo: "disponible", texto: "disponible" };
}

export const referencia = (c: Contrato) =>
  `LC4${String(c.lote).padStart(2, "0")}`;

export const mensualidadesVencidas = (n: number) =>
  n === 1 ? "1 mensualidad vencida" : `${n} mensualidades vencidas`;

/** El WhatsApp para el comprador: lo que debe si va atrasado, o su próximo pago. */
export function recordatorio(
  cliente: Cliente,
  c: Contrato,
  e: EstadoCuenta,
  hoy: string,
): string | null {
  const nombre = cliente.nombre.split(" ")[0] ?? cliente.nombre;
  if (e.vencido > 0)
    return `Hola, ${nombre}. Te escribimos de ${DESARROLLO}. Tu lote ${c.lote} tiene ${mensualidadesVencidas(e.vencidas.length)} por ${pesos(e.vencido)}, más ${pesos(e.moratorio)} de moratorio al ${fecha(hoy)}. Puedes pagar por SPEI a la CLABE ${CLABE} con la referencia ${referencia(c)}. Tu estado de cuenta está en tu portal.`;
  if (e.proxima)
    return `Hola, ${nombre}. Te recordamos que tu ${e.proxima.concepto.toLowerCase()} por ${pesos(e.proxima.importe)} vence el ${fecha(e.proxima.vence)}. Referencia de pago: ${referencia(c)}. Gracias por ir al corriente.`;
  return null;
}

/** Lo más que pagó un cliente, sumando todos sus lotes, en 6 meses: la ventana de acumulación antilavado. */
export function maxSeisMeses(cliente: Cliente): number {
  const pagos = cliente.contratos.flatMap((c) => c.pagos);
  return Math.max(
    0,
    ...pagos.map(([hasta]) => {
      const desde = fechaMes(hasta, -6);
      return pagos
        .filter(([f]) => f > desde && f <= hasta)
        .reduce((s, [, monto]) => s + monto, 0);
    }),
  );
}
