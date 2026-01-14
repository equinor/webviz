import type { HistogramType } from "@modules/_shared/histogram";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";
import type { Axis } from "plotly.js";

import type { PlotBuilder } from "./PlotBuilder";
import { MAX_LABELS_FOR_BARS } from "./plotly/bar";

export interface PlotConfigurerOptions {
    plotType: PlotType;
    firstResultName: string;
    barSelectorColumn: string | null;
    colorBy: string;
    histogramType: HistogramType;
    table: Table;
}

/**
 * Configures PlotBuilder with appropriate axis options and settings
 * based on the plot type. This centralizes all plot-type-specific
 * configuration logic.
 */
export function configurePlotBuilder(plotBuilder: PlotBuilder, options: PlotConfigurerOptions): void {
    const { plotType, firstResultName, barSelectorColumn, colorBy, histogramType, table } = options;

    switch (plotType) {
        case PlotType.CONVERGENCE:
            configureConvergencePlot(plotBuilder, firstResultName);
            break;
        case PlotType.BOX:
            configureBoxPlot(plotBuilder);
            break;
        case PlotType.HISTOGRAM:
            configureHistogramPlot(plotBuilder, histogramType);
            break;
        case PlotType.BAR:
            configureBarPlot(plotBuilder, barSelectorColumn, colorBy, table);
            break;
        case PlotType.DISTRIBUTION:
            break;
    }
}

function configureConvergencePlot(plotBuilder: PlotBuilder, firstResultName: string): void {
    plotBuilder.setXAxisOptions({
        title: { text: "Realizations", standoff: 5 },
    });
    plotBuilder.setYAxisOptions({
        title: { text: firstResultName, standoff: 5 },
    });
}

function configureBoxPlot(plotBuilder: PlotBuilder): void {
    plotBuilder.setYAxisOptions({ showticklabels: false });
}

function configureHistogramPlot(plotBuilder: PlotBuilder, histogramType: HistogramType): void {
    plotBuilder.setYAxisOptions({
        title: { text: "Percentage (%)" },
    });
    plotBuilder.setHistogramType(histogramType);
}

function configureBarPlot(
    plotBuilder: PlotBuilder,
    selectorColumn: string | null,
    colorBy: string,
    table: Table,
): void {
    if (!selectorColumn) {
        return;
    }

    plotBuilder.setPlotType(PlotType.BAR);

    const selectorLength = table.getColumn(selectorColumn)?.getUniqueValues().length ?? 0;
    const baseOptions: Partial<Axis> = {
        type: "category",
        categoryorder: selectorColumn === colorBy ? "total descending" : undefined,
    };

    if (selectorLength >= MAX_LABELS_FOR_BARS) {
        plotBuilder.setXAxisOptions({
            ...baseOptions,
            showticklabels: false,
            title: { text: `${selectorColumn} (hover to see values)`, standoff: 20 },
        });
    } else {
        plotBuilder.setXAxisOptions({
            ...baseOptions,
            title: { text: selectorColumn, standoff: 20 },
        });
    }
}
