import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Native flat config (no FlatCompat) — the FlatCompat → eslint-config-next path
// crashes under ESLint 9 ("Converting circular structure to JSON"). This wires
// the same plugins directly: TypeScript + Next core-web-vitals + React Hooks.
const eslintConfig = tseslint.config(
  {
    ignores: [".next/**", "out/**", "vendor/**", "next-env.d.ts"],
  },
  ...tseslint.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    rules: {
      // Allow intentionally-unused names prefixed with _ (e.g. dropping a
      // field via destructuring: const { rawText: _drop, ...rest } = pd).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);

export default eslintConfig;
