import { ColorPalette } from "@lib/utils/ColorPalette";

export const defaultColorPalettes = [
    new ColorPalette({
        name: "Retro Metro",
        colors: ["#ea5545", "#f46a9b", "#ef9b20", "#edbf33", "#ede15b", "#bdcf32", "#87bc45", "#27aeef", "#b33dc6"],
        id: "retro-metro",
    }),
    new ColorPalette({
        name: "ResInsight",
        colors: [
            "#803E75",
            "#D41C84",
            "#F6768E",
            "#C10020",
            "#7F180D",
            "#F13A13",
            "#FF7A5C",
            "#817066",
            "#FF6800",
            "#593315",
            "#FF8E00",
            "#CEA262",
            "#F4C800",
            "#93AA00",
            "#3B5417",
            "#007D34",
            "#367D7B",
            "#00538A",
            "#A6BDD7",
            "#2E4CE0",
        ],
        id: "resinsight",
    }),
    new ColorPalette({
        name: "Time Series",
        colors: [
            "#1F77B4",
            "#FF7F0E",
            "#2CA02C",
            "#D62728",
            "#9467BD",
            "#8C564B",
            "#E377C2",
            "#7F7F7F",
            "#BCBD22",
            "#17BECF",
        ],
        id: "time-series",
    }),
    new ColorPalette({
        name: "Dutch Field",
        colors: ["#e60049", "#0bb4ff", "#50e991", "#e6d800", "#9b19f5", "#ffa300", "#dc0ab4", "#b3d4ff", "#00bfa0"],
        id: "dutch-field",
    }),
];

export const defaultContinuousSequentialColorPalettes = [
    new ColorPalette({
        name: "Blue to Yellow",
        colors: ["#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#f4f100"],
        id: "blue-to-yellow",
    }),
    new ColorPalette({
        name: "Grey to Red",
        colors: ["#d7e1ee", "#cbd6e4", "#bfcbdb", "#b3bfd1", "#a4a2a8", "#df8879", "#c86558", "#b04238", "#991f17"],
        id: "grey-to-red",
    }),
    new ColorPalette({
        name: "Black to Pink",
        colors: ["#2e2b28", "#3b3734", "#474440", "#54504c", "#6b506b", "#ab3da9", "#de25da", "#eb44e8", "#ff80ff"],
        id: "black-to-pink",
    }),
    new ColorPalette({
        name: "Blues",
        colors: ["#0000b3", "#0010d9", "#0020ff", "#0040ff", "#0060ff", "#0080ff", "#009fff", "#00bfff", "#00ffff"],
        id: "blues",
    }),
    new ColorPalette({
        name: "Yellow to Purple",
        colors: ["#fcfcbe", "#fdc78d", "#fb8d67", "#e45563", "#2c1160", "#6b1f7b", "#2c1160"],
        id: "yellow-to-purple",
    }),
];

export const defaultContinuousDivergingColorPalettes = [
    new ColorPalette({
        name: "Red to Blue",
        colors: ["#b2182b", "#ef8a62", "#fddbc7", "#f8f6e9", "#d1e5f0", "#67a9cf", "#2166ac"],
        id: "red-to-blue",
    }),
    new ColorPalette({
        name: "Berlin",
        colors: ["#b9c6ff", "#2f799d", "#150e0d", "#944834", "#ffeded"],
        id: "berlin",
    }),
    new ColorPalette({
        name: "Orange to Purple",
        colors: ["#ffb400", "#d2980d", "#a57c1b", "#786028", "#363445", "#48446e", "#5e569b", "#776bcd", "#9080ff"],
        id: "orange-to-purple",
    }),
    new ColorPalette({
        name: "Pink Foam",
        colors: ["#54bebe", "#76c8c8", "#98d1d1", "#badbdb", "#dedad2", "#e4bcad", "#df979e", "#d7658b", "#c80064"],
        id: "pink-foam",
    }),
    new ColorPalette({
        name: "Salmon to Aqua",
        colors: ["#e27c7c", "#a86464", "#6d4b4b", "#503f3f", "#333333", "#3c4e4b", "#466964", "#599e94", "#6cd4c5"],
        id: "salmon-to-aqua",
    }),
];
