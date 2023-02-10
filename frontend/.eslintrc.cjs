module.exports = {
    env: {
        node: true,
    },
    extends: ["eslint:recommended", "plugin:react/recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
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
