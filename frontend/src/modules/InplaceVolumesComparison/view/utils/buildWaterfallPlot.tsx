import type React from "react";

import type { Data, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { Figure } from "@modules/_shared/Figure";
import { makeSubplots } from "@modules/_shared/Figure";
import type { NumberFormatOptions } from "@modules/_shared/utils/numberFormatting";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { VolumeChangeDecomposition, WaterfallMeasure } from "./computeVolumeChangeDecomposition";
import { computeBarChangePercent, makeBarDisplayLabels } from "./waterfallBarPresentation";

// plotly.js ships no types for the native "waterfall" trace, so describe the subset we set. Keeping
// the literal typed means a typo in e.g. `measure` or `connector` is still caught.
type WaterfallTrace = Omit<Partial<PlotData>, "type" | "increasing" | "decreasing"> & {
    type: "waterfall";
    measure: WaterfallMeasure[];
    connector?: { mode?: "spanning" | "between" };
    increasing?: { marker?: { color?: string } };
    decreasing?: { marker?: { color?: string } };
    totals?: { marker?: { color?: string } };
};

// Tab10 blue/orange/grey, matching SensitivityPlot's signed-bar convention. Blue vs orange is the
// colorblind-safe axis; the colors are directional only and carry no good/bad meaning.
const INCREASING_COLOR = "#1f77b4";
const DECREASING_COLOR = "#ff7f0e";
const TOTALS_COLOR = "#7f7f7f";

const BAR_TEXT_FORMAT_OPTIONS: NumberFormatOptions = { unitSystem: "si", numSignificantDigits: 3 };

export interface WaterfallUncertaintyBand {
    low: number;
    high: number;
}

export interface WaterfallGroupDecomposition {
    /** Subplot label (e.g. a REGION value). Empty string for a single, ungrouped waterfall. */
    groupLabel: string;
    decomposition: VolumeChangeDecomposition;
    /** Target volume spread in each ensemble, shown in the endpoint bars' hover text. */
    uncertainty: { reference: WaterfallUncertaintyBand; comparison: WaterfallUncertaintyBand } | null;
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
 * (percent relative to the previous cumulative bar).
 */
function makeBarTexts(decomposition: VolumeChangeDecomposition): string[] {
    const { bars } = decomposition;
    return bars.map((bar, index) => {
        const percent = computeBarChangePercent(bars, index);
        if (percent === null) {
            return formatNumber(bar.value, BAR_TEXT_FORMAT_OPTIONS);
        }

        const valueSign = bar.value > 0 ? "+" : "";
        const percentSign = percent > 0 ? "+" : "";
        return `${valueSign}${formatNumber(bar.value, BAR_TEXT_FORMAT_OPTIONS)}  ${percentSign}${percent.toFixed(1)}%`;
    });
}

function makeWaterfallTrace(
    group: WaterfallGroupDecomposition,
    referenceLabel: string,
    comparisonLabel: string,
): Partial<PlotData> {
    const { bars } = group.decomposition;
    const labels = makeBarDisplayLabels(group.decomposition, referenceLabel, comparisonLabel);

    return {
        type: "waterfall",
        orientation: "v",
        measure: bars.map((bar) => bar.measure),
        x: labels,
        y: bars.map((bar) => bar.value),
        text: makeBarTexts(group.decomposition),
        textposition: "outside",
        textfont: { size: 11 },
        hovertext: makeBarHoverTexts(group, labels),
        hoverinfo: "text",
        connector: { mode: "spanning" },
        increasing: { marker: { color: INCREASING_COLOR } },
        decreasing: { marker: { color: DECREASING_COLOR } },
        totals: { marker: { color: TOTALS_COLOR } },
    } satisfies WaterfallTrace as unknown as Partial<PlotData>;
}

/**
 * Hover text per bar. The endpoint bars also carry the ensemble's uncertainty band as text: the
 * within-ensemble spread is typically far wider than the change being decomposed, so drawing it on
 * the same axis would dwarf the factor bars.
 */
function makeBarHoverTexts(group: WaterfallGroupDecomposition, displayLabels: string[]): string[] {
    const { bars } = group.decomposition;
    const barTexts = makeBarTexts(group.decomposition);

    return bars.map((bar, index) => {
        const isReference = index === 0;
        const isComparison = index === bars.length - 1;
        const band = isReference
            ? group.uncertainty?.reference
            : isComparison
              ? group.uncertainty?.comparison
              : undefined;

        if (!band) {
            return `${displayLabels[index]}: ${barTexts[index]}`;
        }

        const low = formatNumber(band.low, BAR_TEXT_FORMAT_OPTIONS);
        const high = formatNumber(band.high, BAR_TEXT_FORMAT_OPTIONS);
        return `${displayLabels[index]}: ${barTexts[index]}<br>P90–P10: ${low} – ${high}`;
    });
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

        figure.addTrace(makeWaterfallTrace(group, options.referenceLabel, options.comparisonLabel), row, col);

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
