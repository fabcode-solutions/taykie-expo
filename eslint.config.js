// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const typescript = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");
const prettier = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = defineConfig([
  expoConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "prettier": prettier,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/switch-exhaustiveness-check": "warn",
      "prettier/prettier": [
        "error",
        {
          endOfLine: "lf",
          printWidth: 100,
          quoteProps: "consistent",
        },
      ],
      "import/no-named-as-default": "off",
    },
  },
  prettierConfig,
  {
    ignores: ["dist/*"],
  },
]);
