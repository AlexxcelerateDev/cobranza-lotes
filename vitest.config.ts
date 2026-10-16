/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// `getViteConfig` y no `defineConfig` de Vitest: un test que importe `astro:content` o use la
// Container API necesita la config de Vite de Astro. Para funciones puras da igual.
export default getViteConfig({
  test: {
    // Una zona horaria con desfase a propósito: en UTC (la del CI) un bug de fechas no se ve.
    env: { TZ: "America/Mexico_City" },
  },
});
