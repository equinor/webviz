import type React from "react";

import type { Data, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import type { NumberFormatOptions } from "@modules/_shared/utils/numberFormatting";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { VolumeChangeDecomposition } from "./computeVolumeChangeDecomposition";

// Tab10 blue/orange/grey, matching SensitivityPlot's signed-bar convention. Blue vs orange is the
// colorblind-safe axis; the colors are directional only and carry no good/bad meaning.
const INCREASING_COLOR = "#1f77b4";
const DECREASING_COLOR = "#ff7f0e";
const TOTALS_COLOR = "#7f7f7f";

const BAR_TEXT_FORMAT_OPTIONS: NumberFormatOptions = { unitSystem: "si", numSignificantDigits: 3 };

export interface WaterfallGroupDecomposition {
    /** Subplot label (e.g. a REGION value). Empty string for a single, ungrouped waterfall. */
    groupLabel: string;
    decomposition: VolumeChangeDecomposition;
}

export interface WaterfallPlotOptions {
    height: number;
    width: number;
    title: string;
    referenceLabel: string;
    comparisonLabel: string;
}

/**
 * Build the per-bar text: absolute value for the endpoint bars, and "+Δ +pct%" for the factor bars
 * (percent relative to the previous cumulative bar), matching the legacy waterfall.
 */
function makeBarTexts(decomposition: VolumeChangeDecomposition): string[] {
    const { bars } = decomposition;
    return bars.map((bar, index) => {
        if (bar.measure === "absolute") {
            return formatNumber(bar.value, BAR_TEXT_FORMAT_OPTIONS);
        }

        const previousCumulative = bars[index - 1]?.cumulative ?? 0;
        const percent = previousCumulative !== 0 ? (100 * bar.value) / previousCumulative : 0;
        const sign = bar.value > 0 ? "+" : "";
        return `${sign}${formatNumber(bar.value, BAR_TEXT_FORMAT_OPTIONS)}  ${sign}${percent.toFixed(1)}%`;
    });
}

function makeWaterfallTrace(
    decomposition: VolumeChangeDecomposition,
    referenceLabel: string,
    comparisonLabel: string,
): Partial<PlotData> {
    const { bars } = decomposition;
    const labels = bars.map((bar, index) => {
        if (index === 0) {
            return referenceLabel;
        }
        if (index === bars.length - 1) {
            return comparisonLabel;
        }
        return bar.label;
    });

    return {
        type: "waterfall",
        orientation: "v",
        measure: bars.map((bar) => bar.measure),
        x: labels,
        y: bars.map((bar) => bar.value),
        text: makeBarTexts(decomposition),
        textposition: "outside",
        textfont: { size: 11 },
        connector: { mode: "spanning" },
        increasing: { marker: { color: INCREASING_COLOR } },
        decreasing: { marker: { color: DECREASING_COLOR } },
        totals: { marker: { color: TOTALS_COLOR } },
    } as unknown as Partial<PlotData>;
}

function makeYAxisRange(decomposition: VolumeChangeDecomposition): [number, number] {
    const cumulatives = decomposition.bars.map((bar) => bar.cumulative);
    const cumulativeMin = Math.min(...cumulatives);
    const cumulativeMax = Math.max(...cumulatives);
    const range = cumulativeMax - cumulativeMin;
    const padding = range !== 0 ? range / 2 : Math.abs(cumulativeMax) * 0.1 || 1;
    return [cumulativeMin - padding, cumulativeMax + padding];
}

function calcNumRowsAndCols(numSubplots: number): { numRows: number; numCols: number } {
    if (numSubplots < 1) {
        return { numRows: 1, numCols: 1 };
    }
    const numRows = Math.ceil(Math.sqrt(numSubplots));
    const numCols = Math.ceil(numSubplots / numRows);
    return { numRows, numCols };
}

/**
 * Render one volume-change waterfall per group (e.g. per REGION) in a subplot grid, using Plotly's
 * native "waterfall" trace. A single group yields a single, ungrouped waterfall.
 */
export function buildWaterfallPlot(
    groups: WaterfallGroupDecomposition[],
    options: WaterfallPlotOptions,
): React.ReactNode {
    const numSubplots = Math.max(groups.length, 1);
    const { numRows, numCols } = calcNumRowsAndCols(numSubplots);
    const isSingleGroup = groups.length <= 1;

    const figure: Figure = makeSubplots({
        numRows,
        numCols,
        height: options.height,
        width: options.width,
        title: options.title,
        subplotTitles: isSingleGroup ? undefined : groups.map((group) => group.groupLabel),
        xAxisType: "category",
        showGrid: false,
        margin: { t: isSingleGroup ? 40 : 60, b: 40, l: 70, r: 20 },
        horizontalSpacing: 0.08,
        verticalSpacing: 0.1,
    });

    groups.forEach((group, index) => {
        const row = Math.floor(index / numCols) + 1;
        const col = (index % numCols) + 1;

        figure.addTrace(
            makeWaterfallTrace(group.decomposition, options.referenceLabel, options.comparisonLabel),
            row,
            col,
        );

        const axisIndex = figure.getAxisIndex(row, col);
        figure.updateLayout({
            [`yaxis${axisIndex}`]: {
                range: makeYAxisRange(group.decomposition),
                gridcolor: "lightgrey",
            },
            [`xaxis${axisIndex}`]: {
                type: "category",
            },
        });
    });

    figure.updateLayout({ showlegend: false, plot_bgcolor: "white" });

    return <Plot data={figure.makeData() as Data[]} layout={figure.makeLayout()} />;
}
