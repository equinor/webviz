import type { EChartsOption } from "echarts";
import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import type { Interfaces } from "@modules/InplaceVolumesEcharts/interfaces";
import { PlotType, type InplaceVolumesPlotOptions } from "@modules/InplaceVolumesEcharts/typesAndEnums";

import { colorByAtom, resultNameAtom, plotTypeAtom, selectorColumnAtom, subplotByAtom } from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { buildEchartsOption } from "../utils/buildEchartsOption";
import { makeInplaceVolumesPlotTitle } from "../utils/createTitle";
import { GroupedTableData } from "../utils/GroupedTableData";
import { buildStatisticsTableData, type StatisticsTableData } from "../utils/TableBuilder";

export function useBuildEchartsPlotAndTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    width: number,
    height: number,
): { echartsOption: EChartsOption; table: Table; statisticsTableData: StatisticsTableData } | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const resultName = useAtomValue(resultNameAtom);
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

    if (aggregatedTableDataQueries.tablesData.length === 0 || !resultName) {
        return null;
    }

    let barSelectorColumn: string | null = null;
    if (plotType === PlotType.BAR && selectorColumn) {
        barSelectorColumn = selectorColumn.toString();
    }

    const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    const title = makeInplaceVolumesPlotTitle(resultName, subplotBy);
    viewContext.setInstanceTitle(title);

    const groupedData = new GroupedTableData({
        table,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
    });

    if (hideConstants) {
        groupedData.filterConstantEntries(resultName);
    }

    const echartsOption = buildEchartsOption({
        groupedData,
        plotType,
        resultName,
        selectorColumn: barSelectorColumn,
        containerSize: { width, height },
        histogramType,
        histogramBins,
        barSortBy,
        showStatisticalMarkers,
        showRealizationPoints,
        showPercentageInHistogram,
        sharedXAxis,
        sharedYAxis,
    });

    if (!echartsOption) return null;

    const statisticsTableData = buildStatisticsTableData(groupedData, resultName);

    return { echartsOption, table, statisticsTableData };
}
