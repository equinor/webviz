import type { Layout } from "plotly.js";

import type { SensitivityResponseDataset } from "../../utils/sensitivityResponseCalculator";

import { numFormat } from "./formatUtils";

export const createLayout = (
    dataset: SensitivityResponseDataset,
    xAxisRange: [number, number],
    isAbsolute: boolean,
    width?: number,
    height?: number,
): Partial<Layout> => {
    return {
        width,
        height,
        margin: { t: 30, r: 0, b: 60, l: 100 },
        barmode: "overlay",
        uirevision: "do not touch",
        xaxis: {
            title: {
                text: isAbsolute ? `${dataset.responseName} (${dataset.responseUnit})` : dataset.scale,
                standoff: 40,
            },
            range: xAxisRange,
        },
        annotations: [
            {
                x: isAbsolute ? dataset.referenceAverage : 0,
                y: 1.05,
                xref: "x",
                yref: "paper",
                text: `<b>${numFormat(dataset.referenceAverage)}</b> (Ref avg)`,
                showarrow: false,
                align: "center",
                standoff: 16,
            },
        ],
        shapes: [
            {
                type: "line",
                line: { width: 3, color: "lightgrey" },
                x0: isAbsolute ? dataset.referenceAverage : 0,
                x1: isAbsolute ? dataset.referenceAverage : 0,
                y0: 0,
                y1: 1,
                xref: "x",
                yref: "paper",
            },
        ],
    };
};
