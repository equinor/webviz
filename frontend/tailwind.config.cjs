const defaultTheme = require("./theme/default.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,ts,tsx}"],
    darkMode: "class",
    theme: defaultTheme,
    plugins: [],
};
