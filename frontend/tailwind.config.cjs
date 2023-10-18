/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,ts,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            keyframes: {
                "linear-indefinite": {
                    "0%": { transform: "translateX(-100%) scaleX(1)" },
                    "50%": { transform: "translateX(0%) scaleX(0.25)" },
                    "100%": { transform: "translateX(100%)" },
                },
            },
            animation: {
                "linear-indefinite": "linear-indefinite 3s cubic-bezier(1, 0.1, 0.1, 1) infinite",
            },
        }
    },
    plugins: [],
};
