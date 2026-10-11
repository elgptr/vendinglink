import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // react-hooks v7 introduced stricter experimental rules. Many existing
      // patterns (fetching data in useEffect, helper components inside render)
      // require non-trivial refactoring. Disable until the codebase is updated.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      // Node scripts legitimately use CommonJS require.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [
      "playwright.config.ts",
      "vitest.config.ts",
      "e2e/**",
      "__tests__/**",
      "dist/**",
    ],
  },
];

export default eslintConfig;
