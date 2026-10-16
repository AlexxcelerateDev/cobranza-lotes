---
paths:
  - "src/**"
  - "public/**"
  - "astro.config.ts"
---

# Astro 7

## Estructura

```text
src/
├── content.config.ts  # colecciones: loader + esquema (Content Layer)
├── content/<coleccion>/  # el contenido que carga el `glob()`
├── layouts/           # el esqueleto HTML: <head>, canónica, CSS global
├── components/        # aparece con el primer componente que se use dos veces
├── lib/               # TypeScript puro, con su `*.test.ts` al lado
├── pages/             # rutas por fichero; `[param].astro` con `getStaticPaths`
└── styles/global.css
public/                # se copia tal cual: favicon, ficheros sin procesar
```

Un fichero hasta que pida dos. `components/` no existe hasta que algo se repita.

**`src/fetch.ts` está reservado** desde Astro 7 (enrutado avanzado). No crear un fichero con ese
nombre para otra cosa.

## Estático por defecto

`output` es `static` y no hay adapter. Lo que exige servidor —`Astro.session`, Actions, server
islands (`server:defer`), `cache`/`routeRules`, una página con `export const prerender = false`—
entra con su adapter (`npx astro add node|netlify|vercel|cloudflare`) cuando haya un caso real, no
antes. Con adapter, las páginas siguen siendo estáticas salvo las que lo pidan.

## Componentes `.astro`

- **Props tipadas siempre**: `interface Props` en el frontmatter. En una ruta dinámica,
  `getStaticPaths` con `satisfies GetStaticPaths` y
  `type Props = InferGetStaticPropsType<typeof getStaticPaths>`: el tipo sale de lo que devuelve.
- **Cero JS por defecto.** Un `<script>` de Astro se empaqueta y deduplica; `is:inline` solo si
  de verdad tiene que ir en línea (y entonces la CSP lo bloquea: ver abajo).
- **Islas** (`client:*`) solo con un framework instalado y cuando HTML + CSS + un `<script>` no
  basten. `client:visible` o `client:idle` antes que `client:load`.
- **HTML válido**: el compilador de Rust de Astro 7 **no** corrige lo que el de Go arreglaba
  solo. Una etiqueta sin cerrar rompe el build; un `<div>` dentro de un `<p>` sale tal cual y el
  navegador lo reparte como quiere.
- **Espacios entre elementos en línea**: `compressHTML` es `'jsx'` por defecto en Astro 7. Un
  salto de línea entre `</a>` y `<em>` desaparece y el texto sale pegado (verificado); un espacio
  en la misma línea se queda. El espacio que importe va explícito: `{" "}`, que es lo que
  Prettier deja al partir la línea.
- Estilos con `<style>` en el componente (van con ámbito). Lo global, en `styles/global.css`.

## Contenido (Content Layer)

- Colecciones en `src/content.config.ts`, cada una con su `loader` (`glob()` / `file()` de
  `astro/loaders`) y su `schema`. Sin esquema, el frontmatter no se valida.
- **`z` de `astro/zod`** (Zod 4), nunca de `astro:content` ni del paquete `zod`: es la versión
  de Astro. Zod 4: `z.email()`, `z.url()` en vez de `z.string().email()`; `{ error: "..." }` en
  vez de `{ message }`.
- Fechas de frontmatter: `z.coerce.date()`, y se formatean con `formatDate` de `src/lib/date.ts`
  (en UTC). Con un `Intl.DateTimeFormat` sin `timeZone`, al oeste de Greenwich salen un día antes.
- La entrada se identifica por `entry.id` y se renderiza con `render(entry)` de `astro:content`.
- **Markdown**: Astro 7 usa Sätteri. Un plugin de remark/rehype necesita instalar
  `@astrojs/markdown-remark` y `markdown.processor: unified()`: se evalúa antes de meterlo.

## Variables de entorno

- **`astro:env`**, nunca `import.meta.env` a pelo: se declaran en `env.schema` de
  `astro.config.ts` con `envField` (tipo, `context` cliente o servidor, `access` público o
  secreto) y se importan de `astro:env/client` o `astro:env/server`. Una pública que falte rompe
  el build; un secreto se valida al leerlo, salvo con `env.validateSecrets: true`, que lo
  adelanta al build (útil en el CI de un sitio con adapter).
- `import.meta.env` se inlinea en el build y **no se convierte**: `"true"` sigue siendo un string.
- Variable nueva → `env.schema` y `.env.example` (créalo con la primera). `.env` nunca se commitea.
- Un secreto (`access: "secret"`) no puede llegar al cliente: es lo que `astro:env` impide.

## Seguridad: CSP

`security.csp` está activo: Astro calcula el hash de cada `<script>` y `<style>` que emite y los
pone en un `<meta http-equiv="content-security-policy">` por página. Lo que **no** cubre:

- **`style="..."` en línea** y un `<script is:inline>` o de terceros: los bloquea. Clases en vez
  de estilos en línea; un script externo se añade a `security.csp.scriptDirective.resources`
  con su origen exacto, nunca `'unsafe-inline'`.
- **Shiki** colorea con estilos en línea: por eso `markdown.syntaxHighlight` es `"prism"`. Con
  bloques de código, un tema de Prism en el CSS.
- `frame-ancestors`, HSTS y demás cabeceras **no** van en un `<meta>`: las pone el hosting
  (`_headers` en Netlify/Cloudflare, `vercel.json`…), cuando se elija.
- La CSP no se aplica en `astro dev`: se comprueba con `npm run build && npm run preview`.

## Imágenes y fuentes

- Imágenes desde `src/assets/` con `<Image />` / `<Picture />` de `astro:assets` (dimensiones,
  formatos modernos, `loading="lazy"`). En `public/` solo lo que no se procesa. `alt` siempre:
  vacío (`alt=""`) si es decorativa. `sharp` llega como dependencia
  opcional de `astro`: no se instala aparte.
- Fuentes: `system-ui` hasta que haya una de marca. Entonces, la API `fonts` de
  `astro.config.ts` (con `fontProviders.local()` o el proveedor que toque) y `<Font />` en el
  `<head>`: las descarga en el build, las sirve desde el propio dominio y precarga la principal.
  Nunca un `<link>` a Google Fonts.

## SEO y accesibilidad

- `Base.astro` pone `lang`, `<title>`, descripción, canónica (de `site` + la ruta) y el enlace al
  sitemap. Toda página pasa por él con `title` y `description` propios.
- Un `<h1>` por página, encabezados sin saltos de nivel, `<main>` único. Con navegación
  repetida antes de `<main>`, un enlace «saltar al contenido».
- Lo que no es HTML semántico no se arregla con ARIA: `<button>` para acciones, `<a href>` para
  navegar. El lint (`jsx-a11y-strict`) lo comprueba en las plantillas.
- Enlaces internos con barra final (`/posts/hola/`): `trailingSlash: "always"` hace 404 en dev
  con un enlace sin ella.
- La barra de herramientas de dev trae una auditoría de accesibilidad: se mira antes de dar una
  página por terminada.

## Transiciones

Las de página son CSS nativo (`@view-transition` en `global.css`). **`<ClientRouter />` no es
compatible con la CSP** (lo dice la doc de `security.csp`): meterlo obliga a elegir entre los dos,
y la CSP gana salvo que haga falta estado que sobreviva a la navegación (`transition:persist`).
