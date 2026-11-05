import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // The UI is HeroUI only, with gravity icons; see docs/UI-GUIDE.md.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@mui/*", "@emotion/*", "@wso2/*"], message: "Use @heroui/react; see docs/UI-GUIDE.md." },
            { group: ["lucide-react"], message: "Use @gravity-ui/icons." },
          ],
        },
      ],
    },
  },
);
