// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import jsdoc from 'eslint-plugin-jsdoc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Flat ESLint config. See `memory/PLAN.md`/`memory/DECISIONS.md` for the reasoning behind
 * each block below; the short version:
 *
 * - `@eslint/js` recommended + `typescript-eslint`'s `recommendedTypeChecked` are the base,
 *   type-aware since this package's correctness leans on Temporal's own precise types.
 * - `@typescript-eslint/no-explicit-any` is set explicitly to `'error'` rather than relying
 *   on the preset's own default — a standing project directive: `any` is never allowed,
 *   enforced here, not just by convention.
 * - `eslint-plugin-react`/`react-hooks` apply only to `.tsx` and `stories/**` — the rest of
 *   the codebase has no JSX at all.
 * - `eslint-plugin-storybook`'s own flat/recommended config is spread as-is for `stories/**`
 *   and `.storybook/**` (those directories don't exist yet as of Milestone 6 — wired ahead
 *   of Milestone 7 so nothing needs revisiting later).
 * - `eslint-plugin-jsdoc` enforces the documentation standard from `PLAN.md`'s Documentation
 *   section across `src/**`, with `jsdoc/require-example` scoped to just the three true
 *   public-API entry files.
 * - No `eslint-plugin-jsx-a11y`: this package authors no DOM-rendering UI of its own — see
 *   `PLAN.md` for the full rationale.
 * - `eslint-config-prettier` last, to disable stylistic rules Prettier already owns.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'storybook-static/**', '.husky/_/**'],
  },
  js.configs.recommended,
  // Scoped to `**/*.{ts,tsx}` via `files` + `extends` (typescript-eslint's own documented
  // pattern for this) rather than spreading `recommendedTypeChecked` unscoped — its base
  // config applies the typescript parser (and every type-aware rule) to *every* linted file
  // regardless of extension otherwise, which breaks on plain JS config files like this one
  // (no type information available for a file outside the TS project).
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.tsx', 'stories/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // Silences eslint-plugin-react's own "React version not specified" warning.
    // `settings.react.version: 'detect'` would be the more accurate choice (this package's
    // own peerDependencies accept React 17/18/19, and "detect" reads whatever's actually
    // installed) — but eslint-plugin-react@7.37.5's detection code still calls the removed
    // ESLint `context.getFilename()` method (dropped in ESLint 10, replaced by the
    // `context.filename` property), crashing every rule that needs to know the React
    // version. Hardcoding the version installed here (React 19) sidesteps that broken code
    // path entirely; re-evaluate "detect" once eslint-plugin-react ships an ESLint-10-clean
    // release.
    settings: { react: { version: '19.2' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules, // React 19: no `import React` / no `react-in-jsx-scope` needed
      ...reactHooks.configs.flat.recommended.rules,
      // TS itself already enforces prop types — react-plugin's own runtime check is redundant.
      'react/prop-types': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          // Only symbols actually reachable from an ESM export need documenting — internal
          // helpers don't, matching PLAN.md's Documentation section ("every exported
          // symbol").
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            MethodDefinition: true,
            ArrowFunctionExpression: true,
          },
          contexts: [
            // `export interface Foo {}` / `export type Foo = ...` — not covered by the
            // `require` node-type list above, which only understands functions/classes.
            'ExportNamedDeclaration > TSInterfaceDeclaration',
            'ExportNamedDeclaration > TSTypeAliasDeclaration',
            // This codebase's dominant method style is an arrow-function *class property*
            // (`public foo = (...) => {...}`), not a shorthand class method — a plain
            // `ArrowFunctionExpression` + `publicOnly` won't reliably trace "is this
            // property reachable from an export" through a class member assignment, so it's
            // matched directly instead.
            'PropertyDefinition[value.type="ArrowFunctionExpression"]',
          ],
        },
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns-description': 'error',
    },
  },
  {
    files: [
      'src/createTemporalAdapter.ts',
      'src/AdapterTemporal.ts',
      'src/TemporalLocalizationProvider.tsx',
    ],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-example': 'error',
    },
  },
  prettier,
);
