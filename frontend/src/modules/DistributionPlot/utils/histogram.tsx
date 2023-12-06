import { ColorSet } from "@lib/utils/ColorSet";

import { Histogram } from "../components/histogram";

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

export function makeHistogram({
    title,
    xValues,
    numBins,
    colorSet,
    width,
    height,
}: {
    title: string;
    xValues: number[];
    numBins: number;
    colorSet: ColorSet;
    width: number;
    height: number;
}): React.ReactNode {
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const binSize = (xMax - xMin) / numBins;
    const bins: { from: number; to: number }[] = Array.from({ length: numBins }, (_, i) => ({
        from: xMin + i * binSize,
        to: xMin + (i + 1) * binSize,
    }));
    bins[bins.length - 1].to = xMax + 1e-6; // make sure the last bin includes the max value
    const binValues: number[] = bins.map((range) => xValues.filter((el) => el >= range.from && el < range.to).length);

    const binStrings = bins.map((range) => `${nFormatter(range.from, 2)}-${nFormatter(range.to, 2)}`);

    return (
        <Histogram
            key="histogram"
            x={binStrings}
            y={binValues}
            xAxisTitle={`${title}`}
            yAxisTitle={""}
            width={width}
            height={height}
            colorSet={colorSet}
        />
    );
}
