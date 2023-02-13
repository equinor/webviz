module.exports = {
    env: {
        node: true,
    },
    extends: ["eslint:recommended", "plugin:react/recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "react/jsx-uses-react": "off", // Import of React is not required anymore in React 17
        "react/react-in-jsx-scope": "off", // Import of React is not required anymore in React 17
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
