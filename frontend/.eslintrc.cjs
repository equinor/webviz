module.exports = {
    env: {
        node: true,
    },
    extends: ["eslint:recommended", "plugin:react/recommended", "plugin:@typescript-eslint/recommended"],
    rules: {},
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
