# Toolchain, dependencias, lint y formato

## Node y npm

- **Node**: `.nvmrc` fija la **major** (`24`, la LTS activa), no el patch. Los hostings la leen
  de ahí (Netlify, Cloudflare Pages, Vercel) y alguno solo acepta majors; el CI también
  (`node-version-file`). `engines.node` dice lo mismo para quien no use `.nvmrc`.
- **npm 11.16 o superior**, exigido por `devEngines` (con `onFail: "error"`). Trae todas las
  claves de `.npmrc` (verificado); uno que no las conozca las ignora con un aviso y la
  instalación sigue sin blindaje. Node 24.18 ya lo trae, así que el CI no instala npm aparte.
- Un solo gestor de paquetes: npm. Nada de `pnpm-lock.yaml` ni `yarn.lock` al lado del
  `package-lock.json`.
- **Subir de major de Node** es tocar `.nvmrc`, `engines`, `devEngines` y el hosting a la vez:
  `git grep -n '">=24"\|^24$'` los saca.

## `.npmrc`: la cadena de suministro

- **`min-release-age=7`**: solo instala versiones con más de 7 días publicadas. Los paquetes
  secuestrados (los gusanos de npm de 2025 fueron el aviso) se detectan y retiran en horas o
  días. Consecuencia visible: `npm install astro@latest` instala la última con una semana, no
  la última. Es lo que se busca.
- **`strict-allow-scripts=true`**: un script de instalación (`postinstall`…) que no esté decidido
  en `allowScripts` de `package.json` hace **fallar** la instalación. Sin la bandera, npm 11 lo
  corre con un aviso y npm 12 lo bloquea con otro: en los dos casos nadie lo lee.
- **`allow-git=none`**: nada de dependencias desde git (en npm 12 ya es el default).
- **`engine-strict=true`**: un Node o npm fuera de `engines`/`devEngines` es error, no aviso.

Y lo que se hace con ellas:

- **Un script de instalación se decide**, no se calla: `npm approve-scripts <paquete>` (lo
  necesita: compila un binario) o `npm deny-scripts <paquete>` (no lo necesita: ya trae binarios
  precompilados por plataforma, que es lo habitual). Los dos escriben en `allowScripts`, y solo
  ven lo instalado: una dependencia de otra plataforma se escribe a mano.
- **`"fsevents": false`**, el único hoy: dependencia opcional de Vite, solo de macOS. Su script
  es `node-gyp rebuild`, pero el paquete ya publica `fsevents.node` compilado. Sin la entrada,
  `npm ci` falla con npm 11 aunque la plataforma no lo instale (verificado en Windows; el CI de
  Linux usa npm 11) y, según su documentación, con npm 12 en macOS.
- **Un parche de seguridad urgente** con menos de 7 días: `min-release-age-exclude` con ese
  paquete, en el mismo commit que lo sube, y se quita en la siguiente actualización.

## Dependencias

- **`package-lock.json` versionado** y el CI instala con `npm ci`: falla si no cuadra con
  `package.json` en vez de resolver versiones nuevas en silencio.
- En un sitio estático `dependencies` y `devDependencies` acaban igual (todo es de build), pero
  la convención se mantiene: lo que importa el código del sitio (`astro`, integraciones) en
  `dependencies`; herramientas (lint, tests, tipos) en `devDependencies`.
- **Antes de añadir una dependencia**: ¿lo hace la plataforma? CSS antes que JS (transiciones,
  modo oscuro, `:has()`), un elemento HTML antes que un componente (`<dialog>`, `<details>`,
  `popover`), `Intl` antes que una librería de fechas.
- **Actualizar**: `npm outdated` y `npm update` (ya respeta `min-release-age`), después el gate.
  Un salto de major se lee en su changelog antes; en Astro, en su guía de migración.
- Auditoría: `npm audit --audit-level=high` y `npm audit signatures` (firmas del registro), en
  el gate y en el CI semanal. Un advisory se arregla subiendo la dependencia, no se ignora.

## TypeScript

- `tsconfig.json` extiende **`astro/tsconfigs/strictest`**: `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noUnusedLocals`… No se relaja por fichero.
- **TypeScript 6.0, no 7.** `@astrojs/check` pide `^5 || ^6` y `typescript-eslint` `<6.1`: con el
  7 no arrancan. Por eso `~6.0.3` y no `^`. Se sube cuando los dos lo soporten.
- `astro check` es el `tsc` de Astro: tipa `.astro`, `.ts` y el contenido contra los esquemas.
  Corre con `--minimumFailingSeverity warning`: un warning (una API deprecada) rompe el gate.

## Lint (`eslint.config.js`)

`@eslint/js` recommended + `typescript-eslint` strict + `eslint-plugin-astro` recommended +
`jsx-a11y-strict` sobre las plantillas `.astro`. Corre con `--max-warnings 0`.

- **Accesibilidad**: el fork `eslint-plugin-jsx-a11y-x`, porque `eslint-plugin-jsx-a11y` no
  soporta ESLint 10. `eslint-plugin-astro` resuelve uno u otro solo; cuando el original lo
  soporte, se cambia el paquete y nada más.
- **Sin lint con tipos** (`strictTypeChecked`): lento y frágil sobre `.astro`, y `astro check`
  con `strictest` ya cubre lo que aportaría. Se reevalúa si aparece un bug que lo habría visto.
- Exenciones: `// eslint-disable-next-line <regla> -- motivo`. Nunca un `eslint-disable` de
  fichero entero ni sin motivo.

## Formato

Prettier con `prettier-plugin-astro`, **sin opciones de estilo**: los defaults. No añadir una para
legalizar una desviación. Respeta `.gitignore` solo (no hace falta `.prettierignore`).

El hook de `.claude/settings.json` corre `prettier --write --cache .` tras cada edición: el paso
de formato del gate no debería fallar nunca. Un fichero puede cambiar justo después de editarlo.
