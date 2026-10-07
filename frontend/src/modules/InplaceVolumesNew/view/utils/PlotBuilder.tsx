import type React from "react";

import type { Axis, LayoutAxis, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { Figure, MakeSubplotOptions } from "@modules/_shared/Figure";
import { calcNumRowsAndCols, CoordinateDomain, makeSubplots } from "@modules/_shared/Figure";
import type { HistogramType } from "@modules/_shared/histogram";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import type { ColorEntry, GroupedTableData } from "./GroupedTableData";
import { hideRepeatedLegendEntries } from "./plotComponentUtils";
import { computeSubplotXAxisSpacing } from "./subplotSpacing";

export type PlotFunction = (colorEntries: ColorEntry[]) => Partial<PlotData>[];

export type PlotBuilderOptions = Pick<
    MakeSubplotOptions,
    "horizontalSpacing" | "showGrid" | "margin" | "sharedXAxes" | "sharedYAxes"
>;

const LEGEND_MAX_HEIGHT_FRACTION = 0.15;
const X_TICK_ANGLE = 35;
const DEFAULT_TICK_FONT_SIZE = 12;
// Plotly's axis title font is 1.2x the layout font (12px).
const AXIS_TITLE_FONT_SIZE = 14;
const DEFAULT_AXIS_TITLE_STANDOFF = 10;

export class PlotBuilder {
    private _groupedData: GroupedTableData;
    private _plotFunction: PlotFunction;
    private _axesOptions: { x: Partial<Axis> | null; y: Partial<Axis> | null } = { x: null, y: null };
    private _numberFormatAxisOptions: { x: Partial<Axis>; y: Partial<Axis> } = { x: {}, y: {} };
    private _highlightedSubPlotNames: string[] = [];
    private _histogramType: HistogramType | null = null;
    private _plotType: PlotType | null = null;

    constructor(groupedData: GroupedTableData, plotFunction: PlotFunction) {
        this._groupedData = groupedData;
        this._plotFunction = plotFunction;
    }

    setXAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.x = options;
    }

    setYAxisOptions(options: Partial<Axis>): void {
        this._axesOptions.y = options;
    }

    setXAxisNumberFormatOptions(options: Partial<Axis>): void {
        this._numberFormatAxisOptions.x = options;
    }

    setYAxisNumberFormatOptions(options: Partial<Axis>): void {
        this._numberFormatAxisOptions.y = options;
    }

    setHistogramType(histogramType: HistogramType): void {
        this._histogramType = histogramType;
    }

    setPlotType(plotType: PlotType): void {
        this._plotType = plotType;
    }

    setHighlightedSubPlots(subPlotNames: string[]): void {
        this._highlightedSubPlotNames = subPlotNames;
    }

    private updateLayout(figure: Figure, hideXTickLabels: boolean) {
        const numRows = figure.getNumRows();
        const numCols = figure.getNumColumns();
        const numSubplots = this._groupedData.getNumSubplots();
        const xAxisOverrides: Partial<LayoutAxis> = { automargin: true };
        if (hideXTickLabels) {
            xAxisOverrides.showticklabels = false;
            const title = this._axesOptions.x?.title;
            if (title?.text) {
                xAxisOverrides.title = { ...title, text: `${title.text}<br>(hover to see values)` };
            }
        }

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const axisIndex = figure.getAxisIndex(row, col);
                const yAxisKey = `yaxis${axisIndex}`;
                const xAxisKey = `xaxis${axisIndex}`;

                const oldLayout = figure.makeLayout();
                // @ts-expect-error - Ignore string type of xAxisKey for oldLayout[xAxisKey]
                const oldXAxis = oldLayout[xAxisKey];
                // @ts-expect-error - Ignore string type of yAxisKey for oldLayout[yAxisKey]
                const oldYAxis = oldLayout[yAxisKey];

                const xAxis: Partial<LayoutAxis> = {
                    ...oldXAxis,
                    ...this._numberFormatAxisOptions.x,
                    ...this._axesOptions.x,
                    ...xAxisOverrides,
                };
                // A title between two subplot rows runs into the subplot below.
                const hasSubplotBelow = row * numCols + col - 1 < numSubplots;
                if (hasSubplotBelow) {
                    delete xAxis.title;
                }

                figure.updateLayout({
                    [xAxisKey]: xAxis,
                    [yAxisKey]: {
                        ...oldYAxis,
                        ...this._numberFormatAxisOptions.y,
                        ...this._axesOptions.y,
                    },
                });
            }
        }
        if (this._histogramType) {
            figure.updateLayout({
                barmode: this._histogramType,
            });
        }
        // Anchored to the figure bottom, the legend reserves its own margin below the x axes.
        // Long legends (e.g. many sensitivity cases) scroll instead of shrinking the plots.
        figure.updateLayout({
            // @ts-expect-error - maxheight is missing in the plotly types
            legend: { yref: "container", y: 0, yanchor: "bottom", maxheight: LEGEND_MAX_HEIGHT_FRACTION },
        });
        if (this._plotType === PlotType.BAR) {
            // Force normal legend order for the bar plot.
            // traceorder seems to be overriden when a categoryorder is set.
            figure.updateLayout({
                legend: { traceorder: "normal" },
            });
        }
    }

    /**
     * The x axes' automargin and the legend reserve the space below the bottom row, so `options.margin.b`
     * only needs to add some air.
     */
    build(height: number, width: number, options?: PlotBuilderOptions): React.ReactNode {
        const { figure, hideXTickLabels } = this.buildSubplots(height, width, options ?? {});
        this.updateLayout(figure, hideXTickLabels);
        return <Plot layout={figure.makeLayout()} data={figure.makeData()} />;
    }

    private buildSubplots(
        height: number,
        width: number,
        options: PlotBuilderOptions,
    ): { figure: Figure; hideXTickLabels: boolean } {
        const subplotGroups = this._groupedData.getSubplotGroups();
        const numSubplots = subplotGroups.length;

        if (numSubplots === 0) {
            const figure = makeSubplots({
                numRows: 1,
                numCols: 1,
                height,
                width,
                ...options,
            });
            return { figure, hideXTickLabels: false };
        }

        const { numRows, numCols } = calcNumRowsAndCols(numSubplots);

        const traces: { row: number; col: number; trace: Partial<PlotData> }[] = [];
        const subplotTitles: string[] = Array(numRows * numCols).fill("");
        const highlightedSubplots: { row: number; col: number }[] = [];

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const index = (row - 1) * numCols + col - 1;
                if (index >= numSubplots) {
                    continue;
                }

                const subplotGroup = subplotGroups[index];
                subplotTitles[index] = subplotGroup.subplotLabel;

                if (this._highlightedSubPlotNames.includes(subplotGroup.subplotKey)) {
                    highlightedSubplots.push({ row, col });
                }

                const plotDataArr = this._plotFunction(subplotGroup.colorEntries);
                for (const plotData of plotDataArr) {
                    traces.push({ row, col, trace: plotData });
                }
            }
        }
        hideRepeatedLegendEntries(traces.map(({ trace }) => trace));

        const xAxisOptions = this._axesOptions.x ?? {};
        const xAxisTitle = xAxisOptions.title;
        const categoryLabels =
            xAxisOptions.type === "category"
                ? traces.flatMap(({ trace }) => ((trace.x ?? []) as unknown[]).map((value) => String(value)))
                : null;
        // Upper bound: the legend shrinks the plot area by at most its max height.
        const numLegendEntries = traces.filter(({ trace }) => trace.showlegend !== false).length;
        const legendHeight = numLegendEntries > 0 ? LEGEND_MAX_HEIGHT_FRACTION * height : 0;
        // Only category labels are rotated; numeric ticks stay horizontal so the one-line estimate holds.
        const xTickAngle = categoryLabels ? X_TICK_ANGLE : 0;

        const spacing = computeSubplotXAxisSpacing({
            numRows,
            availableHeight: height - (options.margin?.t ?? 0) - (options.margin?.b ?? 0) - legendHeight,
            showTickLabels: xAxisOptions.showticklabels !== false,
            categoryLabels,
            tickAngle: xTickAngle,
            tickFontSize: xAxisOptions.tickfont?.size ?? DEFAULT_TICK_FONT_SIZE,
            axisTitle: xAxisTitle?.text
                ? {
                      standoff: xAxisTitle.standoff ?? DEFAULT_AXIS_TITLE_STANDOFF,
                      fontSize: xAxisTitle.font?.size ?? AXIS_TITLE_FONT_SIZE,
                  }
                : null,
        });

        const figure = makeSubplots({
            numRows,
            numCols,
            height,
            width,
            subplotTitles,
            xAxisTickAngle: xTickAngle,
            verticalSpacing: spacing.verticalSpacing,
            ...options,
        });

        for (const { row, col, trace } of traces) {
            figure.addTrace(trace, row, col);
        }

        for (const { row, col } of highlightedSubplots) {
            figure.addShape(
                {
                    type: "rect",
                    line: {
                        color: "blue",
                        width: 1,
                    },
                    x0: 0,
                    x1: 1,
                    y0: 0,
                    y1: 1,
                },
                row,
                col,
                CoordinateDomain.SCENE,
                CoordinateDomain.SCENE,
            );
        }

        return { figure, hideXTickLabels: !spacing.showTickLabels && xAxisOptions.showticklabels !== false };
    }
}
