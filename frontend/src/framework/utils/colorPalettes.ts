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
        name: "Blues",
        colors: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
        id: "blues",
    }),
];

export const defaultContinuousDivergingColorPalettes = [
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
    new ColorPalette({
        name: "RdYlBu",
        colors: [
            "#a50026",
            "#d73027",
            "#f46d43",
            "#fdae61",
            "#fee090",
            "#ffffbf",
            "#e0f3f8",
            "#abd9e9",
            "#74add1",
            "#4575b4",
            "#313695",
        ],
        id: "rdylbu",
    }),
    new ColorPalette({
        name: "Coolwarm",
        colors: [
            "#3a4cc0",
            "#6788ee",
            "#9abbff",
            "#c9d7f0",
            "#ddd9c7",
            "#f4d9a7",
            "#feb880",
            "#fd8961",
            "#e85a4f",
            "#b40426",
        ],
        id: "coolwarm",
    }),
    new ColorPalette({
        name: "Spectral",
        colors: [
            "#9e0142",
            "#d53e4f",
            "#f46d43",
            "#fdae61",
            "#fee08b",
            "#ffffbf",
            "#e6f598",
            "#abdda4",
            "#66c2a5",
            "#3288bd",
            "#5e4fa2",
        ],
        id: "spectral",
    }),
    new ColorPalette({
        name: "Seismic",
        colors: [
            "#00004c",
            "#000080",
            "#0000ff",
            "#4040ff",
            "#8080ff",
            "#ffffff",
            "#ff8080",
            "#ff4040",
            "#ff0000",
            "#800000",
            "#4c0000",
        ],
        id: "seismic",
    }),
];
