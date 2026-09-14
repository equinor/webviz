import type { Axis } from "plotly.js";

import type { HistogramType } from "@modules/_shared/histogram";
import { makeInplaceVolumesAxisFormat } from "@modules/_shared/InplaceVolumes/numberFormat";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import type { PlotBuilder } from "./PlotBuilder";
import { MAX_LABELS_FOR_BARS } from "./plotly/bar";

export interface PlotConfigurerOptions {
    plotType: PlotType;
    resultName: string;
    barSelectorColumn: string | null;
    colorBy: string;
    histogramType: HistogramType;
    barSelectorLength: number;
}

/**
 * Configures PlotBuilder with appropriate axis options and settings
 * based on the plot type. This centralizes all plot-type-specific
 * configuration logic.
 */
export function configurePlotlyLayoutAxisByPlotType(plotBuilder: PlotBuilder, options: PlotConfigurerOptions): void {
    const { plotType, resultName, barSelectorColumn, colorBy, histogramType, barSelectorLength } = options;

    const responseAxisFormat = makeInplaceVolumesAxisFormat(resultName);

    if (plotType === PlotType.CONVERGENCE) {
        plotBuilder.setYAxisNumberFormatOptions(responseAxisFormat);
        configureConvergencePlot(plotBuilder, resultName);
    } else if (plotType === PlotType.BOX) {
        plotBuilder.setXAxisNumberFormatOptions(responseAxisFormat);
        configureBoxPlot(plotBuilder);
    } else if (plotType === PlotType.HISTOGRAM) {
        plotBuilder.setXAxisNumberFormatOptions(responseAxisFormat);
        configureHistogramPlot(plotBuilder, histogramType);
    } else if (plotType === PlotType.BAR) {
        plotBuilder.setYAxisNumberFormatOptions(responseAxisFormat);
        configureBarPlot(plotBuilder, barSelectorColumn, colorBy, barSelectorLength);
    } else if (plotType === PlotType.DISTRIBUTION) {
        plotBuilder.setXAxisNumberFormatOptions(responseAxisFormat);
        configureDistributionPlot(plotBuilder);
    }
}

function configureDistributionPlot(plotBuilder: PlotBuilder): void {
    plotBuilder.setYAxisOptions({ visible: false });
    plotBuilder.setXAxisOptions({ zeroline: false });
}

function configureConvergencePlot(plotBuilder: PlotBuilder, resultName: string): void {
    plotBuilder.setXAxisOptions({
        title: { text: "Realizations", standoff: 5 },
    });
    plotBuilder.setYAxisOptions({
        title: { text: resultName, standoff: 5 },
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
    selectorLength: number,
): void {
    if (!selectorColumn) {
        return;
    }

    plotBuilder.setPlotType(PlotType.BAR);

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
