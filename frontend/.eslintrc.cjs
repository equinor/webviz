module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    plugins: ["@typescript-eslint", "react"],
    extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react-hooks/recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "react/jsx-uses-react": "off", // Import of React is not required anymore in React 17
        "react/react-in-jsx-scope": "off", // Import of React is not required anymore in React 17
        "no-console": ["error", { allow: ["debug", "info", "warn", "error"] }],
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 8,
        sourceType: "module",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
