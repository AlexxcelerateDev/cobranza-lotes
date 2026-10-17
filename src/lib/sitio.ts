// Lo que nombra al sitio en más de una página.

/** Nombre provisional: cambia aquí y en `public/og.png`. */
export const NOMBRE = "Lotes al Día";

/**
 * Ruta interna con la base del sitio (`base` en `astro.config.ts`): `ruta("/demo/")` →
 * `/cobranza-lotes/demo/`. Un enlace escrito a mano como `/demo/` sale de la subcarpeta y da 404.
 * `BASE_URL` es una constante de Vite, no una variable de entorno: no va por `astro:env`.
 */
export const ruta = (path: `/${string}`): string =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;

/** Registro al piloto (Google Forms). Las respuestas llegan a la cuenta de AlexxcelerateDev. */
export const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSca7LMQHqo-3A_-LnjDGb6OILVLCh3HyE29rIIy7ek0ozI35w/viewform";
