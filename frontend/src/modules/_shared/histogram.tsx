import { PlotData } from "plotly.js";

function nFormatter(num: number, digits: number): string {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "B" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    const item = lookup
        .slice()
        .reverse()
        .find(function (item) {
            return num >= item.value;
        });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}

export type HistogramBinRange = { from: number; to: number };

export function makeHistogramBinRangesFromValuesArray({
    xValuesArray,
    numBins,
}: {
    xValuesArray: number[][];
    numBins: number;
}): HistogramBinRange[] {
    const xMin = Math.min(...xValuesArray.map((el) => Math.min(...el)));
    const xMax = Math.max(...xValuesArray.map((el) => Math.max(...el)));
    return makeHistogramBinRangesFromMinAndMaxValues({ xMin, xMax, numBins });
}

export function makeHistogramBinRangesFromMinAndMaxValues({
    xMin,
    xMax,
    numBins,
}: {
    xMin: number;
    xMax: number;
    numBins: number;
}): HistogramBinRange[] {
    const binSize = (xMax - xMin) / numBins;
    const bins: { from: number; to: number }[] = Array.from({ length: numBins }, (_, i) => ({
        from: xMin + i * binSize,
        to: xMin + (i + 1) * binSize,
    }));
    bins[bins.length - 1].to = xMax + 1e-6; // make sure the last bin includes the max value
    return bins;
}

export function makeHistogramTrace({
    xValues,
    numBins,
    bins,
    color,
}: {
    xValues: number[];
    numBins?: number;
    bins?: { from: number; to: number }[];
    color: string;
}): Partial<PlotData> {
    if (!bins) {
        if (!numBins) {
            throw new Error("Either bins or numBins must be provided");
        }
        bins = makeHistogramBinRangesFromValuesArray({ xValuesArray: [xValues], numBins });
    }
    const binValues: number[] = bins.map((range) => xValues.filter((el) => el >= range.from && el < range.to).length);
    const binStrings = bins.map((range) => `${nFormatter(range.from, 2)}-${nFormatter(range.to, 2)}`);

    const trace: Partial<PlotData> = {
        x: binStrings,
        y: binValues,
        marker: {
            size: 5,
            color: color,
        },
        showlegend: false,
        type: "bar",
    };

    return trace;
}
