import React from "react";

import ReactECharts from "echarts-for-react";
import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Table as TableComponent } from "@lib/components/Table";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import type { Interfaces } from "../interfaces";

import { areSelectedTablesComparableAtom } from "./atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "./atoms/queryAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useBuildEchartsPlotAndTable } from "./hooks/usePlotAndTableBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { makeStatisticsTableColumns } from "./utils/makeStatisticsTableColumns";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = useColorSet(props.workbenchSettings);

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);

    // Keep hover refs for future use (subplot highlight etc.)
    void hoveredRegion;
    void hoveredZone;
    void hoveredFacies;

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const showStatisticsTable = props.viewContext.useSettingsToViewInterfaceValue("showTable");

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter);

    const plotHeightFraction = showStatisticsTable ? 0.7 : 1;

    const plotAndTableData = useBuildEchartsPlotAndTable(
        props.viewContext,
        ensembleSet,
        colorSet,
        divBoundingRect.width,
        divBoundingRect.height * plotHeightFraction,
    );

    const table = plotAndTableData?.table;
    const echartsOption = plotAndTableData?.echartsOption;
    const statisticsTableData = plotAndTableData?.statisticsTableData;

    usePublishToDataChannels(props.viewContext, ensembleSet, colorSet, table);

    const tableColumns = React.useMemo(() => {
        if (!statisticsTableData) return null;
        return makeStatisticsTableColumns(
            statisticsTableData.subplotByLabel,
            statisticsTableData.colorByLabel,
            statisticsTableData.colorMap,
        );
    }, [statisticsTableData]);

    function createErrorMessage(): string | null {
        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load inplace volumes table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected inplace volumes tables are not comparable due to mismatching fluids, result names or index columns";
        }
        return null;
    }

    const isPending = aggregatedTableDataQueries.isFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="w-full h-full relative flex flex-col">
            <PendingWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                <div style={{ height: divBoundingRect.height * plotHeightFraction }}>
                    {echartsOption && (
                        <ReactECharts option={echartsOption} style={{ width: "100%", height: "100%" }} notMerge />
                    )}
                </div>
                {showStatisticsTable && statisticsTableData && tableColumns && (
                    <div className="border-t" style={{ height: divBoundingRect.height * (1 - plotHeightFraction) }}>
                        <TableComponent
                            columns={tableColumns}
                            rows={statisticsTableData.rows}
                            rowIdentifier="id"
                            height={divBoundingRect.height * (1 - plotHeightFraction)}
                        />
                    </div>
                )}
            </PendingWrapper>
        </div>
    );
}
