# cobranza-lotes — sitio de «Lotes al Día»

Sitio público de la idea `cobranza-lotes-en-abonos` (en `idea-lab`): software de cobranza para
desarrolladoras que venden lotes con financiamiento directo. Tres páginas indexables —portada,
calculadora de plan de pagos y umbral antilavado, y demo del portal— que llevan al formulario del
piloto. Astro 7, estático, TypeScript `strictest`, CSP por hashes. Nació de `plantilla-astro`.

Las convenciones están en `.claude/rules/` (toolchain, Astro, tests, CI). Este archivo solo
cubre lo que no se deduce leyendo el código: lo decidido no hacer (con fecha y motivo) y las
trampas.

## Gate completo, lo mismo que corre el CI

```bash
npm ci && npm audit signatures && npx prettier --check . && npm run lint && npm run check && npm test && npm run build && npm audit --audit-level=high
```

Por máquina, una vez: Node 24 (`.nvmrc`) con npm ≥ 11.16, que Node 24.18 ya trae. Con uno más
viejo `npm ci` falla por `devEngines`, a propósito: la política de `.npmrc` no se aplicaría.

## Comandos

- `npm run dev`: servidor de desarrollo en `http://localhost:4321`.
- `npm run build && npm run preview`: el sitio tal como se publica. **Es el único sitio donde se
  ve la CSP**: en `dev` no se aplica, y un script bloqueado solo aparece aquí.

## Claude Code

- Antes de commitear: el agente `gate` (lo mecánico) y después `revisor` (lo que pasa el gate y
  aun así está mal: seguridad, JS de más, accesibilidad).
- `.claude/settings.json` deja correr el gate sin pedir permiso y hace que `npm install`,
  `npm add` y `npm update` pregunten siempre: cada dependencia nueva es cadena de suministro.
  También niega leer los `.env`.
- Un hook corre `prettier --write --cache .` tras cada edición: el paso de formato del gate no
  debería fallar nunca, y un fichero puede cambiar justo después de editarlo.

## Trampas

- **`npm install astro@latest` no instala la última**, sino la última con 7 días
  (`min-release-age` en `.npmrc`). Es la política, no un fallo. Al crear la plantilla, Astro
  7.4.0 tenía menos de una semana y entró la 7.3.8.
- **Una dependencia nueva puede romper la instalación** con `ESTRICTALLOWSCRIPTS`: trae un
  script de instalación y hay que decidirlo (`.claude/rules/00-toolchain.md`).
- **`animation` + `animation-timeline` no se escriben juntos.** Lightning CSS (el minificador de
  Vite 8) mete `animation-timeline` dentro del shorthand `animation`, donde no es válido, y el
  navegador descarta la declaración: la animación de scroll desaparece sin error. Con una línea de
  tiempo, siempre propiedades sueltas (`animation-name`…). Verificado con lightningcss 1.33.
- **TypeScript está fijado a `~6.0`**: el 7 ya salió, pero `@astrojs/check` y `typescript-eslint`
  no lo soportan. Un `npm update` no lo sube; hacerlo a mano rompe `astro check` y el lint.

## El sitio

- **Lógica en `src/lib/`, con su test al lado**: `planes.ts` (el motor de planes de pago,
  reproduce al peso planes publicados en anuncios), `calculadora.ts` (de los campos del
  formulario a los textos), `cartera.ts` (la cartera ficticia de la demo, una foto al corte
  `HOY`) y `formato.ts` (pesos y fechas en UTC).
- **La calculadora es la única página con JavaScript.** El primer esquema sale calculado en el
  HTML con la misma `calcular()` que usa el `<script>` al cambiar un campo. Las filas que repinta
  el script no llevan el atributo del CSS con ámbito: sus estilos van con `:global()`.
- **La demo es estática**: un estado de cuenta por lote vendido (`/demo/lotes/[n]/`), con
  `noindex` y fuera del sitemap (`astro.config.ts`): son 16 páginas casi iguales con datos
  ficticios.
- **Nombre provisional** «Lotes al Día»: en `src/lib/sitio.ts` y dentro de `public/og.png`
  (1200 × 630, hecha con `sharp` desde un SVG). Cambiar el nombre es cambiar los dos.
- **Iconos**: `public/favicon.svg` es el original; `favicon.ico` (32 px) y
  `apple-touch-icon.png` (180 px, sin esquinas redondeadas) salen de él con `sharp`. Cambiar el
  logo es regenerar los tres.
- **Dominio pendiente**: `site` sigue en `https://example.com`. Hasta que cambie, la canónica,
  `og:url`, `og:image`, el sitemap y `robots.txt` apuntan a otro sitio.
- La UMA (`UMA` en `calculadora.ts`) es la de 2026: se actualiza cada enero con la que publique el
  INEGI.

## Decidido no hacer

Todo con fecha 2026-10-16, al crear el sitio.

- **Precios en la portada.** El piloto mide cuánto pagarían (pregunta 6 del formulario); un
  precio publicado sesgaría la respuesta. Entran cuando el piloto dé la cifra.
- **Playwright para la calculadora.** El cálculo está probado en `src/lib/`; el `<script>` solo
  lee campos y pinta textos, y se revisó a mano en el navegador. Entra si la calculadora gana
  lógica en el cliente.
- **Analítica.** El formulario de Google ya cuenta los registros, que es la métrica del piloto.
  Si entra una, sin cookies y con su origen en la CSP.
- **Biome en vez de ESLint + Prettier**, **adapter**, **Tailwind o frameworks de UI**,
  **`<ClientRouter />`** y **Dependabot / Renovate**: por los motivos de `plantilla-astro`.
