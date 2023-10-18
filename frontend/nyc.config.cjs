module.exports = {
    extends: "@istanbuljs/nyc-config-typescript",
    /* include all TypeScript sources from folder "src", excluding type definitions and test files */
    cwd: ".",
    include: ["./src/lib/components/**/*.tsx"],
    extension: [".tsx"],
    exclude: ["**/*.d.ts", "**/index.ts"],

    /* instrument all files, not just the ones touched by the test cases */
    all: true,

    cache: false,
    "check-coverage": true,

    reporter: ["html", "lcov"],
};
