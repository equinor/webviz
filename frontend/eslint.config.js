import eslintCore from "@eslint/js";
import configPrettier from "eslint-config-prettier";
import * as importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import eslintTypescript from "typescript-eslint";

export default eslintTypescript.config(
    // Plugins --------------------------------------------------------------------------
    eslintCore.configs.recommended,
    eslintTypescript.configs.recommended,
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat["jsx-runtime"],
    importPlugin.flatConfigs.recommended,
    reactHooksPlugin.configs.flat.recommended,
    // Configure typescript resolver
    // ! Make sure "eslint-import-resolver-typescript" is installed
    {
        settings: {
            "import/resolver": {
                // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
                typescript: { alwaysTryTypes: true },
            },
        },
    },

    // Specify react version (stops a warning when running lint)
    { settings: { react: { version: "detect" } } },
    // Make import plugin work with typescript files
    {
        files: ["**/*.{ts,tsx}"],
        extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    },

    // ! Make sure prettier is *after* other plugins, so it can override
    configPrettier,

    { ignores: ["scripts/", "playwright/", "coverage/", "dist/"] },

    // Other configs  -------------------------------------------------------------------
    {
        languageOptions: {
            sourceType: "module",
            ecmaVersion: 8,
            parser: eslintTypescript.parser,
            globals: { ...globals.browser, ...globals.es2021, ...globals.node },
        },
    },
    // Custom rules ---------------------------------------------------------------------
    {
        // generate-api will use the project linter config. However, the generated code occasionally uses bare-bones ts-comments, so we need to relax the rule a bit for this folder specifically
        files: ["src/api/**"],
        rules: { "@typescript-eslint/ban-ts-comment": "off" },
    },

    {
        rules: {
            // TODO: These rules were introduced after deps update. It's relevant in a lot of files so we'll hold off while we wait for the EDS branch to be merged.
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/refs": "off",
            "react-hooks/purity": "off",
            // This rule seems to be very inconsistent at the moment, and causes false flags in some of our code, most notably with some of our `withDefaults` usage
            "react-hooks/preserve-manual-memoization": "off",
        },
    },
    {
        // Lodash-es exposes the "chain" utility in its typing, but the function will fail due to tree-shaking in production. This rule config should flag any use of chain as an error
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "lodash-es",
                            importNames: ["chain"],
                            message:
                                "`lodash-es` is meant to be tree-shaken, therefore importing `chain` from lodash-es causes issues in production. Do not import `chain` from lodash-es",
                        },
                    ],
                },
            ],
            "no-restricted-syntax": [
                "error",
                {
                    selector: "MemberExpression[object.name='_'][property.name='chain']",
                    message:
                        "`lodash-es` is meant to be tree-shaken, therefore `_.chain` causes issues in production. Do not use `_.chain`",
                },
                {
                    selector: "CallExpression[callee.name='_']",
                    message:
                        "`lodash-es` is meant to be tree-shaken, therefore `_(value)` is equivalent of using `_.chain` which causes issues in production. Do not use `_.chain`",
                },
            ],
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unused-expressions": ["warn", { allowShortCircuit: true, allowTernary: true }], // Allow some useful "unused" expressions, such as `foo && foo()`
            "@typescript-eslint/consistent-type-imports": "warn",
            "@typescript-eslint/no-explicit-any": "off",
            "react/prop-types": "off", // Causes issues in classes (and I don't see why you'd need this along with TS)
            "react/jsx-uses-react": "off", // Import of React is not required anymore in React 17
            "react/react-in-jsx-scope": "off", // Import of React is not required anymore in React 17
            "no-console": ["error", { allow: ["debug", "info", "warn", "error"] }],
            "import/no-named-as-default-member": "off", // Conflicts with us requiring always using the react default
            "import/order": [
                "warn",
                {
                    groups: [
                        "builtin", // Node.js builtins: fs, path, etc.
                        "external", // Packages from node_modules
                        "internal", // Aliased paths (e.g. @, @core)
                        "parent", // ../
                        "sibling", // ./file
                        "index", // ./index
                    ],
                    pathGroups: [
                        { pattern: "react", group: "external", position: "before" },
                        { pattern: "@core/**", group: "internal", position: "before" },
                        { pattern: "@components/**", group: "internal", position: "before" },
                        { pattern: "@shared-types/**", group: "internal", position: "before" },
                        { pattern: "@assets/**", group: "internal", position: "before" },
                        { pattern: "@/**", group: "internal" }, // fallback for anything else under @
                    ],
                    pathGroupsExcludedImportTypes: ["react"],
                    alphabetize: { order: "asc", caseInsensitive: true },
                    "newlines-between": "always",
                },
            ],
        },
    },
);
