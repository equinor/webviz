import { ColorPalette } from "@lib/utils/ColorPalette";

/**
 * ColorBrewer palettes (Set1, Dark2, Paired, Blues, RdBu, RdYlBu, Spectral):
 * Copyright (c) 2002 Cynthia Brewer, Mark Harrower, and The Pennsylvania State University.
 * Licensed under the Apache License 2.0. http://colorbrewer2.org/
 *
 * Matplotlib palettes (Tab10, Viridis, Plasma, Inferno, Cividis, Coolwarm, Seismic):
 * Part of the matplotlib project. https://matplotlib.org/
 */
/**
 * Turbo colormap:
 * Created by Anton Mikhailov at Google Research.
 * Licensed under the Apache License 2.0.
 * https://ai.googleblog.com/2019/08/turbo-improved-rainbow-colormap-for.html
 */
export const defaultColorPalettes = [
    new ColorPalette({
        name: "Tab10 (Matplotlib default)",
        colors: [
            "#1f77b4",
            "#ff7f0e",
            "#2ca02c",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
            "#bcbd22",
            "#17becf",
        ],
        id: "tab10",
    }),
    new ColorPalette({
        name: "Set1",
        colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"],
        id: "set1",
    }),
    new ColorPalette({
        name: "Dark2",
        colors: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"],
        id: "dark2",
    }),
    new ColorPalette({
        name: "Paired",
        colors: [
            "#a6cee3",
            "#1f78b4",
            "#b2df8a",
            "#33a02c",
            "#fb9a99",
            "#e31a1c",
            "#fdbf6f",
            "#ff7f00",
            "#cab2d6",
            "#6a3d9a",
            "#ffff99",
            "#b15928",
        ],
        id: "paired",
    }),
];

export const defaultContinuousSequentialColorPalettes = [
    new ColorPalette({
        name: "Turbo",
        colors: [
            "#30123b",
            "#4145ab",
            "#4675ed",
            "#39a2fc",
            "#1bcfd4",
            "#24eca6",
            "#61fc6c",
            "#a4fc3b",
            "#d1e834",
            "#f3c63a",
            "#fe9b2d",
            "#f36315",
            "#d93806",
            "#b11901",
            "#7a0402",
        ],
        id: "turbo",
    }),
    new ColorPalette({
        name: "Viridis",
        colors: ["#440154", "#482777", "#3f4a8a", "#31678e", "#26838f", "#1f9d8a", "#6cce5a", "#b6de2b", "#fee825"],
        id: "viridis",
    }),
    new ColorPalette({
        name: "Plasma",
        colors: ["#0d0887", "#5302a3", "#8b0aa5", "#b83289", "#db5c68", "#f48849", "#febd2a", "#f0f921"],
        id: "plasma",
    }),
    new ColorPalette({
        name: "Inferno",
        colors: ["#000004", "#1b0c41", "#4a0c6b", "#781c6d", "#a52c60", "#cf4446", "#ed6925", "#fb9b06", "#fcfdbf"],
        id: "inferno",
    }),
    new ColorPalette({
        name: "Cividis",
        colors: ["#00224e", "#123570", "#3b496c", "#575d6d", "#707173", "#8a8678", "#a59c74", "#c3b369", "#e1cc55"],
        id: "cividis",
    }),

    new ColorPalette({
        name: "Water",
        colors: ["#ffffff", "#e6f0ff", "#b3d4ff", "#66aaff", "#3388ff", "#0066cc", "#004d99", "#003366"],
        id: "water",
    }),

    new ColorPalette({
        name: "Oil",
        colors: ["#ffffff", "#f0fff0", "#d9ffd9", "#b3ffb3", "#80e680", "#4dcc4d", "#339933", "#1a661a"],
        id: "oil",
    }),

    new ColorPalette({
        name: "Gas",
        colors: ["#ffffff", "#fff5f0", "#ffe6e0", "#ffc9c0", "#ff9999", "#e67373", "#cc4d4d", "#b33030"],
        id: "gas",
    }),

    new ColorPalette({
        name: "Thickness",
        colors: ["#ffffff", "#e0f0ff", "#80c8e6", "#40b8b8", "#80c080", "#d4d466", "#ffaa66", "#ff7766", "#d93030"],
        id: "thickness",
    }),
];

export const defaultContinuousDivergingColorPalettes = [
    new ColorPalette({
        name: "BuRd",
        colors: [
            "#053061",
            "#2166ac",
            "#4393c3",
            "#92c5de",
            "#d1e5f0",
            "#f7f7f7",
            "#fddbc7",
            "#f4a582",
            "#d6604d",
            "#b2182b",
            "#67001f",
        ],
        id: "burd",
    }),
    new ColorPalette({
        name: "BuOr",
        colors: [
            "#053061",
            "#2166ac",
            "#4393c3",
            "#92c5de",
            "#d1e5f0",
            "#f7f7f7",
            "#fee0b6",
            "#fdb863",
            "#e08214",
            "#b35806",
            "#7f3b08",
        ],
        id: "buo",
    }),
    new ColorPalette({
        name: "BrBg",
        colors: [
            "#543005",
            "#8c510a",
            "#bf812d",
            "#dfc27d",
            "#f6e8c3",
            "#f5f5f5",
            "#c7eae5",
            "#80cdc1",
            "#35978f",
            "#01665e",
            "#003c30",
        ],
        id: "brbg",
    }),
    new ColorPalette({
        name: "PuOr",
        colors: [
            "#2d004b",
            "#542788",
            "#8073ac",
            "#b2abd2",
            "#d8daeb",
            "#f7f7f7",
            "#fee0b6",
            "#fdb863",
            "#e08214",
            "#b35806",
            "#7f3b08",
        ],
        id: "puor",
    }),
    new ColorPalette({
        name: "RdBu",
        colors: [
            "#67001f",
            "#b2182b",
            "#d6604d",
            "#f4a582",
            "#fddbc7",
            "#f7f7f7",
            "#d1e5f0",
            "#92c5de",
            "#4393c3",
            "#2166ac",
            "#053061",
        ],
        id: "rdbu",
    }),
];
