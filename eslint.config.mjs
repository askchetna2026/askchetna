// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...storybook.configs["flat/recommended"],

  /**
   * Keep the ephemeris out of the browser.
   *
   * `src/lib/astrology/calculator.ts` does `require('./swisseph-binaries')` —
   * 16.8 MB of base64. The require sits inside a function, but a literal
   * specifier is statically analysable, so webpack follows it into any bundle
   * that reaches calculator.ts. Three components imported only `getZodiacSign`,
   * `getNakshatra` and a type from it, and that alone made /chart's client chunk
   * 16.6 MB — 6.3 MB over the wire, against 39 KB after the split.
   *
   * Nothing in the type system or the build output makes that visible: the page
   * works perfectly, it is just enormous. So it is a lint rule. Client code
   * imports the pure half from './zodiac'; server code (API routes, lib/ai,
   * engine) may keep importing calculator directly.
   */
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/lib/astrology/calculator",
          message:
            "Importing calculator.ts from client code pulls the 16.8 MB swisseph " +
            "binaries into the browser bundle. Import the pure helpers and types " +
            "from '@/lib/astrology/zodiac' instead.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
