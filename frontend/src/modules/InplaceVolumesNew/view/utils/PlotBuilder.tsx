import type React from "react";

import type { Axis, PlotData } from "plotly.js";

import { Plot } from "@modules/_shared/components/Plot";
import type { Figure, MakeSubplotOptions } from "@modules/_shared/Figure";
import { CoordinateDomain, makeSubplots } from "@modules/_shared/Figure";
import type { HistogramType } from "@modules/_shared/histogram";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import type { ColorEntry, GroupedTableData } from "./GroupedTableData";

export type PlotFunction = (colorEntries: ColorEntry[]) => Partial<PlotData>[];

export class PlotBuilder {
    private _groupedData: GroupedTableData;
    private _plotFunction: PlotFunction;
    private _axesOptions: { x: Partial<Axis> | null; y: Partial<Axis> | null } = { x: null, y: null };
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

    setHistogramType(histogramType: HistogramType): void {
        this._histogramType = histogramType;
    }

    setPlotType(plotType: PlotType): void {
        this._plotType = plotType;
    }

    setHighlightedSubPlots(subPlotNames: string[]): void {
        this._highlightedSubPlotNames = subPlotNames;
    }

    private calcNumRowsAndCols(numSubplots: number): { numRows: number; numCols: number } {
        if (numSubplots < 1) {
            return { numRows: 1, numCols: 1 };
        }

        const numRows = Math.ceil(Math.sqrt(numSubplots));
        const numCols = Math.ceil(numSubplots / numRows);
        return { numRows, numCols };
    }

    private updateLayout(figure: Figure) {
        const numRows = figure.getNumRows();
        const numCols = figure.getNumColumns();

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const axisIndex = figure.getAxisIndex(row, col);
                const yAxisKey = `yaxis${axisIndex}`;
                const xAxisKey = `xaxis${axisIndex}`;

                const oldLayout = figure.makeLayout();

                figure.updateLayout({
                    // @ts-expect-error - Ignore string type of xAxisKey for oldLayout[xAxisKey]
                    [xAxisKey]: { ...oldLayout[xAxisKey], ...this._axesOptions.x },
                    // @ts-expect-error - Ignore string type of yAxisKey for oldLayout[yAxisKey]
                    [yAxisKey]: { ...oldLayout[yAxisKey], ...this._axesOptions.y },
                });
            }
        }
        if (this._histogramType) {
            figure.updateLayout({
                barmode: this._histogramType,
            });
        }
        if (this._plotType === PlotType.BAR) {
            // Force normal legend order for the bar plot.
            // traceorder seems to be overriden when a categoryorder is set.
            figure.updateLayout({
                legend: { traceorder: "normal" },
            });
        }
    }

    build(
        height: number,
        width: number,
        options?: Pick<
            MakeSubplotOptions,
            "horizontalSpacing" | "verticalSpacing" | "showGrid" | "margin" | "sharedXAxes" | "sharedYAxes"
        >,
    ): React.ReactNode {
        const figure = this.buildSubplots(height, width, options ?? {});
        this.updateLayout(figure);
        return <Plot layout={figure.makeLayout()} data={figure.makeData()} />;
    }

    private buildSubplots(
        height: number,
        width: number,
        options: Pick<
            MakeSubplotOptions,
            "horizontalSpacing" | "verticalSpacing" | "showGrid" | "margin" | "sharedXAxes" | "sharedYAxes"
        >,
    ): Figure {
        const subplotGroups = this._groupedData.getSubplotGroups();
        const numSubplots = subplotGroups.length;

        if (numSubplots === 0) {
            return makeSubplots({
                numRows: 1,
                numCols: 1,
                height,
                width,
                ...options,
            });
        }

        const { numRows, numCols } = this.calcNumRowsAndCols(numSubplots);

        const traces: { row: number; col: number; trace: Partial<PlotData> }[] = [];
        const subplotTitles: string[] = Array(numRows * numCols).fill("");
        const highlightedSubplots: { row: number; col: number }[] = [];

        let legendAdded = false;
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
                    if (legendAdded) {
                        plotData.showlegend = false;
                    }
                    traces.push({ row, col, trace: plotData });
                }
                legendAdded = true;
            }
        }

        const figure = makeSubplots({
            numRows,
            numCols,
            height,
            width,
            subplotTitles,
            xAxisTickAngle: 35,
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

        return figure;
    }
}
