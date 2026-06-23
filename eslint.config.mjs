import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import eslintReact from "@eslint-react/eslint-plugin";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  {
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
      "@eslint-react": eslintReact,
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/prefer-as-const": "error",

      // React rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",

      // Next.js rules
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",

      // React memory leak prevention rules
      "@eslint-react/web-api-no-leaked-event-listener": "warn",
      "@eslint-react/web-api-no-leaked-timeout": "warn",
      "@eslint-react/web-api-no-leaked-interval": "warn",
      "@eslint-react/web-api-no-leaked-fetch": "warn",
      "@eslint-react/web-api-no-leaked-resize-observer": "warn",
      "@eslint-react/web-api-no-leaked-intersection-observer": "warn",

      // General JavaScript rules
      "prefer-const": "error",
      "no-unused-vars": "off",
      "no-console": "warn",
      "no-debugger": "error",
      "no-empty": "warn",
      "no-irregular-whitespace": "error",
      "no-case-declarations": "off",
      "no-fallthrough": "error",
      "no-mixed-spaces-and-tabs": "error",
      "no-redeclare": "error",
      "no-undef": "off",
      "no-unreachable": "error",
      "no-useless-escape": "warn",
    },
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-console": "off",
    },
  },

  {
    files: ["prisma/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },

  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "*.js", "scripts/**", "next.config.ts", "tailwind.config.ts"],
  },
];

export default eslintConfig;
