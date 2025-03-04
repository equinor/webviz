import globals from "globals";

import eslintCore from "@eslint/js";
import eslintTypescript from "typescript-eslint";

import configPrettier from "eslint-config-prettier";

import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import * as importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";

export default eslintTypescript.config(
    // Plugins --------------------------------------------------------------------------
    eslintCore.configs.recommended,
    eslintTypescript.configs.recommended,
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat["jsx-runtime"],
    importPlugin.flatConfigs.recommended,
    // ! Currently unable to directly import recommended hooks-plugin config. Need to manually set them up for now
    // ! See: https://github.com/facebook/react/issues/32431
    // reactHooksPlugin.configs["recommended-latest"],
    {
        plugins: { "react-hooks": reactHooksPlugin },
        rules: { ...reactHooksPlugin.configs.recommended.rules },
    },
    // Specify react version (stops a warning when running lint)
    { settings: { react: { version: "detect" } } },

    // Make import plugin work with typescript files
    {
        files: ["**/*.{ts,tsx}"],
        extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
        settings: {
            "import/resolver": { typescript: true },
        },
    },

    // ! Make sure prettier is *after* other plugins, so it can override
    configPrettier,

    // Other configs  -------------------------------------------------------------------
    {
        languageOptions: {
            sourceType: "module",
            ecmaVersion: 8,
            parser: tsParser,
            globals: { ...globals.browser, ...globals.es2021 },
        },
    },
    // Custom rules ---------------------------------------------------------------------
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "react/prop-types": "off", // Causes issues in classes (and I don't see why you'd need this along with TS)
            "react/jsx-uses-react": "off", // Import of React is not required anymore in React 17
            "react/react-in-jsx-scope": "off", // Import of React is not required anymore in React 17
            "no-console": ["error", { allow: ["debug", "info", "warn", "error"] }],
        },
    },
);
