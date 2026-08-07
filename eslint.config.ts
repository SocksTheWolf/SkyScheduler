import js from "@eslint/js";
//@ts-ignore
import baseConfig from '@hono/eslint-config';
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([".wrangler/**", ".github/**", ".vscode/**", "assets/**", "src/wrangler.d.ts"]),
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"],
    languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "curly": "off",
      // hono gets
      "@typescript-eslint/no-unsafe-assignment": "off",
      // necessary for valid, uuidValid, has, isEmpty, etc
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "error",
      // ts ignore annoyances
      "@typescript-eslint/ban-ts-comment": "off"
    }
  }
]);
