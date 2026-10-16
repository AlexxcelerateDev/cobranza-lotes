const pesosFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** `941412.75` → `$941,413`: montos para leer, sin centavos. */
export function pesos(monto: number): string {
  return pesosFmt.format(monto);
}

const fechaFmt = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  // `new Date("2026-10-16")` es medianoche UTC. Formateada en la zona del equipo, al oeste de
  // Greenwich sale el día anterior.
  timeZone: "UTC",
});

/** `2026-10-16` → `16 oct 2026`. */
export function fecha(iso: string): string {
  return fechaFmt.format(new Date(iso));
}
