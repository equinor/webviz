import React from "react";

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
import { useBuildPlotAndTable } from "./hooks/usePlotAndTableBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { makeStatisticsTableColumns } from "./utils/statisticsTableColumnsBuilder";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = useColorSet(props.workbenchSettings);

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const showStatisticsTable = props.viewContext.useSettingsToViewInterfaceValue("showTable");

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter);

    const plotHeightFraction = showStatisticsTable ? 0.7 : 1;

    const plotAndTableData = useBuildPlotAndTable(
        props.viewContext,
        ensembleSet,
        colorSet,
        divBoundingRect.width,
        divBoundingRect.height * plotHeightFraction,
        hoveredRegion?.regionName ?? null,
        hoveredZone?.zoneName ?? null,
        hoveredFacies?.faciesName ?? null,
    );

    const table = plotAndTableData?.table;
    const plots = plotAndTableData?.plots;
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

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = aggregatedTableDataQueries.isFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="w-full h-full relative flex flex-col">
            <PendingWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                <div style={{ height: divBoundingRect.height * plotHeightFraction }}>{plots ?? null}</div>
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
