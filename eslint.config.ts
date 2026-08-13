import js from "@eslint/js";
//@ts-ignore
import baseConfig from "@hono/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import { configObject } from "./jsrules.config";

export default defineConfig([
  globalIgnores([".wrangler/**", ".github/**", "assets/dep/**", ".vscode/**", "dist/**", "src/definitions/wrangler.d.ts", "*.config.ts", "assets/js/min/**"]),
  // ESLint for Typescript
  {
    files: ["src/**.{ts,tsx}"],
    plugins: { js },
    extends: ["js/recommended", tseslint.configs.strictTypeChecked, baseConfig],
    languageOptions: {
      parserOptions: {
        projectService: true,
      }
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
  },
  // ESLint for website JS
  {
    files: ["assets/js/**.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...configObject,
      }
    },
    rules: {
      "no-control-regex": "off",
      "no-unused-vars": "off",
      "no-useless-escape": ["error", {
        "allowRegexCharacters": ["-", ".", ":"]
      }]
    }
  }
]);
