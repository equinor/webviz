import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { PlotType, type InplaceVolumesPlotOptions } from "@modules/InplaceVolumesNew/typesAndEnums";

import { colorByAtom, firstResultNameAtom, plotTypeAtom, selectorColumnAtom, subplotByAtom } from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { makeInplaceVolumesPlotTitle } from "../utils/createTitle";
import { GroupedTableData } from "../utils/GroupedTableData";
import { PlotBuilder } from "../utils/PlotBuilder";
import { makePlotData, type MakePlotDataOptions } from "../utils/plotComponentUtils";
import { configurePlotBuilder } from "../utils/PlotConfigurer";
import { buildStatisticsTableData, type StatisticsTableData } from "../utils/TableBuilder";

export function useBuildPlotAndTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    width: number,
    height: number,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): { plots: React.ReactNode; table: Table; statisticsTableData: StatisticsTableData } | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
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

    // Handle cases where there is a second response
    let barSelectorColumn: string | null = null;
    if (plotType === PlotType.BAR && selectorColumn) {
        barSelectorColumn = selectorColumn.toString();
    }

    const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    const title = makeInplaceVolumesPlotTitle(firstResultName, subplotBy);
    viewContext.setInstanceTitle(title);

    // Create GroupedTableData - shared data structure for plot and table
    const groupedData = new GroupedTableData({
        table,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
    });

    // Filter out grouped entries where all values are constant (zero variance)
    if (hideConstants) {
        groupedData.filterConstantEntries(firstResultName);
    }

    const plotDataOptions: MakePlotDataOptions = {
        plotType,
        firstResultName: firstResultName ?? "",
        secondResultNameOrSelectorName: barSelectorColumn ?? "",
        histogramBins,
        barSortBy,
        showStatisticalMarkers,
        showRealizationPoints,
        showPercentageInBar: showPercentageInHistogram,
    };

    const plotBuilder = new PlotBuilder(groupedData, makePlotData(plotDataOptions));

    // Configure plot-type-specific axis options
    configurePlotBuilder(plotBuilder, {
        plotType,
        firstResultName,
        barSelectorColumn,
        colorBy,
        histogramType,
        table,
    });

    // Set highlighted subplots based on hover state
    const hoveredItem = hoveredRegion ?? hoveredZone ?? hoveredFacies;
    if (hoveredItem) {
        plotBuilder.setHighlightedSubPlots([hoveredItem]);
    }

    const horizontalSpacing = 80 / width;
    const verticalSpacing = 60 / height;

    const plots = plotBuilder.build(height, width, {
        horizontalSpacing,
        verticalSpacing,
        showGrid: true,
        sharedXAxes: sharedXAxis,
        sharedYAxes: sharedYAxis,
        margin: { t: 20, b: 50, l: 50, r: 20 },
    });

    // Build statistics table data using the same grouped data
    const statisticsTableData = buildStatisticsTableData(groupedData, firstResultName);

    return { plots, table, statisticsTableData };
}
