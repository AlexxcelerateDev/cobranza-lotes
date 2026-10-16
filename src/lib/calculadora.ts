// La calculadora de `/calculadora/`: del formulario a los textos que se pintan. La usan el build
// (el primer esquema sale ya calculado en el HTML) y el `<script>` de la página al cambiar algo.
import { fecha, pesos } from "./formato";
import { cruce, plan, ventanaMax, type Fila, type Plan } from "./planes";

/** Desde febrero de 2026, recibir esto o más de un cliente en 6 meses obliga a revisar el aviso. */
export const UMBRAL_UMAS = 8025;
/** Valor diario de la UMA en 2026 (INEGI). */
export const UMA = 117.31;
export const FIRMA = "2026-11-10";

/** Los campos del formulario, por su `name`. */
export interface Entrada {
  precio: number;
  eng: number;
  engTipo: "pct" | "mxn";
  meses: number;
  firma: string;
  msi: number;
  /** % mensual */
  tasa: number;
  anN: number;
  anMonto: number;
  finalPct: number;
  /** 0 = se calcula */
  fija: number;
  /** 0 = el plazo */
  nMens: number;
  uma: number;
}

type Esquema = Omit<Entrada, "firma" | "uma">;
const base = {
  msi: 0,
  tasa: 0,
  anN: 0,
  anMonto: 0,
  finalPct: 0,
  fija: 0,
  nMens: 0,
};

// Los esquemas que más se ven en los anuncios de lotes con financiamiento directo.
const tipico: Esquema = {
  ...base,
  precio: 450000,
  eng: 20,
  engTipo: "pct",
  meses: 36,
  msi: 36,
};
export const ESQUEMAS: { nombre: string; valores: Esquema }[] = [
  { nombre: "20 % + 36 meses sin intereses", valores: tipico },
  {
    nombre: "35 % + 12 meses sin intereses",
    valores: {
      ...base,
      precio: 2550000,
      eng: 35,
      engTipo: "pct",
      meses: 12,
      msi: 12,
    },
  },
  {
    nombre: "30 % + 6 sin intereses y luego 1 %",
    valores: {
      ...base,
      precio: 300000,
      eng: 30,
      engTipo: "pct",
      meses: 24,
      msi: 6,
      tasa: 1,
    },
  },
  {
    nombre: "Anualidades y saldo al mes 60",
    valores: {
      ...base,
      precio: 629255,
      eng: 19499,
      engTipo: "mxn",
      meses: 60,
      msi: 60,
      anN: 4,
      anMonto: 19499,
      fija: 5499,
      nMens: 54,
    },
  },
  {
    nombre: "Lote de $1.5 millones, 60 % de enganche",
    valores: {
      ...base,
      precio: 1500000,
      eng: 60,
      engTipo: "pct",
      meses: 24,
      msi: 24,
    },
  },
];

/** Lo que muestra la calculadora al abrir: el esquema más común. */
export const INICIAL: Entrada = { ...tipico, firma: FIRMA, uma: UMA };

export interface Resultado {
  filas: Fila[];
  enganche: string;
  engancheNota: string;
  mensualidad: string;
  mensualidadNota: string;
  total: string;
  totalNota: string;
  /** El saldo final o pago contra escritura, que conviene avisar desde la firma. */
  final: { titulo: string; texto: string } | null;
  umbral: string;
  ventana: string;
  ventanaNota: string;
  /** Lo más pagado en 6 meses entre el umbral: 1 o más lo alcanza. */
  proporcion: number;
  /** El pago con el que se alcanza el umbral. */
  cruce: Fila | null;
  alerta: { titulo: string; texto: string };
}

const pct = (x: number) =>
  x.toLocaleString("es-MX", { maximumFractionDigits: 1 });

/** Lanza un `Error` legible si los pagos suman más que el precio. */
export function calcular(e: Entrada): Resultado {
  const meses = Math.max(1, Math.round(e.meses));
  const enganche =
    e.engTipo === "pct" ? Math.round((e.precio * e.eng) / 100) : e.eng;
  const p: Plan = {
    precio: e.precio,
    enganche,
    meses,
    firma: e.firma || FIRMA,
    anualidades: { n: Math.round(e.anN), monto: e.anMonto },
  };
  if (e.fija > 0) {
    p.mensualidad = e.fija;
    p.nMens = Math.min(meses, Math.round(e.nMens) || meses);
  } else {
    p.msi = Math.min(meses, Math.round(e.msi));
    p.tasa = e.tasa / 100;
    p.final = Math.round((e.precio * e.finalPct) / 100);
  }
  const filas = plan(p);

  const mens = filas.filter((f) => f.tipo === "mensualidad");
  const primera = mens[0];
  // Si la mensualidad cambia (al empezar los intereses), se dice desde cuándo. La última no
  // cuenta: absorbe el redondeo.
  const corte = mens.slice(0, -1).findIndex((f) => f.monto !== primera?.monto);
  const despues = mens[corte];
  const final = filas.find((f) => f.tipo === "final");
  const total = filas.reduce((s, f) => s + f.monto, 0);
  const interes = filas.reduce((s, f) => s + f.interes, 0);

  const umbral = e.uma * UMBRAL_UMAS;
  const v = ventanaMax(filas);
  const proporcion = umbral ? v.monto / umbral : 0;
  const c = cruce(filas, umbral);

  return {
    filas,
    enganche: pesos(enganche),
    engancheNota: e.precio
      ? `${pct((enganche / e.precio) * 100)} % del precio`
      : "",
    mensualidad: primera ? pesos(primera.monto) : "—",
    mensualidadNota: despues
      ? `los primeros ${corte} meses; luego ${pesos(despues.monto)}`
      : `${mens.length} pagos`,
    total: pesos(total),
    totalNota:
      interes > 0.5 ? `${pesos(interes)} de intereses` : "sin intereses",
    final: final
      ? {
          titulo: `${final.concepto} en el mes ${final.mes}: ${pesos(final.monto)}`,
          texto: `Es el ${pct((final.monto / e.precio) * 100)} % del precio y vence el ${fecha(final.fecha)}. Conviene recordárselo al comprador desde la firma.`,
        }
      : null,
    umbral: pesos(umbral),
    ventana: pesos(v.monto),
    ventanaNota: `meses ${v.desde} a ${v.hasta} · ${Math.round(proporcion * 100)} % del umbral`,
    proporcion,
    cruce: c?.fila ?? null,
    alerta: c
      ? {
          titulo: `Alcanza el umbral con el pago del ${fecha(c.fila.fecha)} (${c.fila.concepto.toLowerCase()})`,
          texto: `En los 6 meses que terminan ahí suma ${pesos(c.suma)}. Integra su expediente antes de recibir ese pago y revisa con tu responsable de cumplimiento si corresponde aviso.`,
        }
      : {
          titulo: "Con este plan no llega al umbral",
          texto:
            "Ojo: si el mismo cliente compra más lotes o adelanta pagos, sus montos se suman.",
        },
  };
}
