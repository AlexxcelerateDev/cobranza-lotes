---
paths:
  - "src/**/*.ts"
  - "src/**/*.astro"
  - "vitest.config.ts"
---

# Testing

## Qué se prueba

Un sitio estático tiene poca lógica, y la que tiene suele estar mal puesta: metida en el
frontmatter de una página, donde no se puede probar. La regla es sacarla a `src/lib/` como
función pura y probar esa. El HTML que sale ya lo validan `astro check` (tipos, esquemas del
contenido) y el build (una ruta que no genera, una etiqueta sin cerrar).

- **Unitarios**: `src/lib/<x>.test.ts` junto a `<x>.ts`. Vitest, sin red ni disco: la suite
  entera en menos de un segundo.
- **Componentes**: con la Container API (`experimental_AstroContainer` de `astro/container`),
  cuando un componente tenga lógica de verdad (props que cambian el HTML de forma no obvia). Un
  componente que solo pinta sus props no se prueba: lo cubren los tipos.

## Vitest

- `vitest.config.ts` usa `getViteConfig` de Astro: un test que importe un `.astro` o algo de
  `astro:*` funciona sin más configuración.
- Los tests corren en **`TZ=America/Mexico_City`** a propósito. En UTC, la zona del CI, un bug de
  fechas no se ve; con desfase negativo, una fecha de frontmatter mal formateada sale el día
  anterior y el test cae. Verificado: quitar el `timeZone` de `src/lib/date.ts` lo rompe.
- **El tiempo se inyecta**: una función que dependa de "ahora" lo recibe por parámetro, o el
  test no es determinista. Nada de `vi.useFakeTimers()` para tapar un `new Date()` interno.

## Tests tabulares: array + `for`

Para matrices de casos, un array y un `for`; `test.each` no aporta nada más. Lo no negociable:
**el assert identifica la fila que falla**.

```ts
for (const [raw, expected] of cases) {
  expect(formatDate(new Date(raw)), raw).toBe(expected);
}
```

## Reglas de estilo

- Nombre del test = comportamiento, en español: `"formatDate respeta el límite de año"`, no
  `"works"`.
- Un comportamiento por test; preparar / actuar / comprobar reconocibles.
- `toBe` / `toEqual` sobre `toBeTruthy`: enseñan el valor al fallar.
- Nada de `sleep` ni esperas por reloj.
- Un test rojo no se cambia para que pase sin entender por qué falla.

## Qué NO añadir (y cuándo sí)

| Herramienta           | Cuándo sí                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Playwright            | Cuando haya interactividad en el cliente (un formulario con JS, una isla) que un fallo rompa sin que el build se entere.           |
| `jsdom` / `happy-dom` | Para probar un `<script>` de cliente que toque el DOM. No para HTML que sale del servidor: eso lo da la Container API como string. |
| `@vitest/coverage-v8` | Diagnóstico puntual. **Nunca como gate con umbral**: genera tests que no prueban nada.                                             |
| Snapshots             | HTML grande y estable. Para un `toBe` de una línea es peor.                                                                        |
