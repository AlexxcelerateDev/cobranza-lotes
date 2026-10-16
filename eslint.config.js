import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/", ".astro/"]),
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  // Las reglas de `eslint-plugin-jsx-a11y` aplicadas a las plantillas `.astro`. Las resuelve del
  // fork `eslint-plugin-jsx-a11y-x`: el original no soporta ESLint 10.
  astro.configs["jsx-a11y-strict"],
]);
