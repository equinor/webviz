import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";
import { type InplaceVolumesPlotOptions } from "@modules/InplaceVolumesPlot/typesAndEnums";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import {
    colorByAtom,
    plotTypeAtom,
    secondResultNameAtom,
    firstResultNameAtom,
    selectorColumnAtom,
    subplotByAtom,
} from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { makeInplaceVolumesPlotTitle } from "../utils/createTitle";
import { PlotBuilder } from "../utils/PlotBuilder";
import { makeFormatLabelFunction, makePlotData, type MakePlotDataOptions } from "../utils/plotComponentUtils";
import { MAX_LABELS_FOR_BARS } from "../utils/plotly/bar";

export function useBuildPlotAndTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    width: number,
    height: number,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): { plots: React.ReactNode; table: Table } | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
    const secondResultName = useAtomValue(secondResultNameAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const {
        histogramType,
        histogramBins,
        barSortBy,
        showStatisticalMarkers,
        showRealizationPoints,
        sharedXAxis,
        sharedYAxis,
        hideConstants,
        showPercentageInHistogram,
    }: InplaceVolumesPlotOptions = { ...viewContext.useSettingsToViewInterfaceValue("plotOptions") };

    // Return null if there is no data to plot
    if (aggregatedTableDataQueries.tablesData.length === 0 || !firstResultName) {
        return null;
    }

    let table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    // Filter out rows where the response is 0 if the option is enabled
    if (hideConstants) {
        table = table.filterRows((row) => row[firstResultName] !== 0 && row[firstResultName] != null);
    }
    let resultNameOrSelectorName: string | null = null;
    if (plotType === PlotType.BAR && selectorColumn) {
        resultNameOrSelectorName = selectorColumn.toString();
    }
    if (plotType !== PlotType.BAR && secondResultName) {
        resultNameOrSelectorName = secondResultName.toString();
    }

    const title = makeInplaceVolumesPlotTitle(plotType, firstResultName, resultNameOrSelectorName, subplotBy);
    viewContext.setInstanceTitle(title);

    const colorByColumn = table.getColumn(colorBy ?? "");
    const hasMultipleTraces = (colorByColumn?.getUniqueValues().length ?? 0) > 1;
    const plotDataOptions: MakePlotDataOptions = {
        plotType,
        firstResultName: firstResultName ?? "",
        secondResultNameOrSelectorName: resultNameOrSelectorName ?? "",
        colorBy,
        ensembleSet,
        colorSet,
        histogramBins,
        barSortBy,
        showStatisticalMarkers,
        showRealizationPoints,
        hasMultipleTraces,
        showPercentageInBar: showPercentageInHistogram,
    };
    const plotbuilder = new PlotBuilder(table, makePlotData(plotDataOptions));

    plotbuilder.setSubplotByColumn(subplotBy);
    plotbuilder.setFormatLabelFunction(makeFormatLabelFunction(ensembleSet));

    if (hoveredRegion) {
        plotbuilder.setHighlightedSubPlots([hoveredRegion]);
    }
    if (hoveredZone) {
        plotbuilder.setHighlightedSubPlots([hoveredZone]);
    }
    if (hoveredFacies) {
        plotbuilder.setHighlightedSubPlots([hoveredFacies]);
    }

    if (plotType === PlotType.SCATTER) {
        plotbuilder.setXAxisOptions({ title: { text: firstResultName ?? "", standoff: 20 } });
        plotbuilder.setYAxisOptions({ title: { text: secondResultName ?? "", standoff: 20 } });
    } else if (plotType === PlotType.CONVERGENCE) {
        plotbuilder.setXAxisOptions({ title: { text: "Realizations", standoff: 5 } });
        plotbuilder.setYAxisOptions({ title: { text: firstResultName ?? "", standoff: 5 } });
    } else if (plotType === PlotType.BOX) {
        plotbuilder.setYAxisOptions({ showticklabels: false });
    } else if (plotType === PlotType.HISTOGRAM) {
        plotbuilder.setYAxisOptions({ title: { text: "Percentage (%)" } });
        plotbuilder.setHistogramType(histogramType);
    } else if (plotType === PlotType.BAR && selectorColumn) {
        // Disable x-axis labels if there are too many bars
        // Try to make Plotly behave when sorting the bars.
        const selectorLength = table.getColumn(selectorColumn)?.getUniqueValues().length ?? 0;
        plotbuilder.setPlotType(PlotType.BAR);
        if (selectorLength >= MAX_LABELS_FOR_BARS) {
            plotbuilder.setXAxisOptions({
                type: "category",
                categoryorder: selectorColumn === colorBy ? "total descending" : undefined,
                showticklabels: false,
                title: { text: `${selectorColumn?.toString()} (hover to see values)`, standoff: 20 },
            });
        } else {
            plotbuilder.setXAxisOptions({
                type: "category",
                categoryorder: selectorColumn === colorBy ? "total descending" : undefined,
                title: { text: selectorColumn?.toString(), standoff: 20 },
            });
        }
    }

    const horizontalSpacing = 80 / width;
    const verticalSpacing = 60 / height;

    const plots = plotbuilder.build(height, width, {
        horizontalSpacing,
        verticalSpacing,
        showGrid: true,
        sharedXAxes: sharedXAxis,
        sharedYAxes: sharedYAxis,

        margin: plotType === PlotType.HISTOGRAM ? { t: 20, b: 50, l: 50, r: 20 } : { t: 20, b: 50, l: 50, r: 20 },
    });

    return { plots, table };
}
