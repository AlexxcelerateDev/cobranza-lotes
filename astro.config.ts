import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // URL pública del sitio: la usan la canónica y `og:url`/`og:image` de `Base.astro`, el sitemap
  // y `robots.txt`. Es GitHub Pages sin dominio propio: el sitio vive en la subcarpeta del repo,
  // `base`. Todo enlace interno pasa por `ruta()` de `src/lib/sitio.ts`; con un dominio propio,
  // `site` cambia y `base` se borra.
  site: "https://alexxceleratedev.github.io",
  base: "/cobranza-lotes",
  // Una sola forma de cada URL. Con el default (`ignore`) `/demo` y `/demo/` responden los dos en
  // dev, y un enlace sin barra solo se descubre cuando el hosting lo redirige o da 404.
  // `always` casa con `build.format: 'directory'` (el default: `demo/index.html`).
  trailingSlash: "always",
  integrations: [
    // Los estados de cuenta de la demo llevan `noindex` (`Base.astro`): tampoco van al sitemap.
    sitemap({ filter: (page) => !page.includes("/demo/lotes/") }),
  ],
  // CSP con hashes de cada `<script>` y `<style>` que emite Astro, en un `<meta>` por página.
  // Un `style="..."` en línea o un script de terceros no entra: ver `.claude/rules/01-astro.md`.
  security: { csp: true },
  // Shiki colorea el código con `style="..."` en línea, que la CSP bloquea; Prism pone clases.
  markdown: { syntaxHighlight: "prism" },
  // Fuentes de marca: se descargan en el build y se sirven desde el propio dominio (`<Font />` en
  // `Base.astro`). Solo los pesos que usa `global.css`.
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Bricolage Grotesque",
      cssVariable: "--font-display",
      weights: [600, 700],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "IBM Plex Sans",
      cssVariable: "--font-body",
      weights: [400, 500, 600],
      styles: ["normal"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
});
