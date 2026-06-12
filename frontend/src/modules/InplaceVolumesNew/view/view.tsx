import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { StatusWrapper } from "@lib/newComponents/StatusWrapper";
import { Table } from "@lib/newComponents/Table";
import { TableCompositions } from "@lib/newComponents/Table/compositions";

import type { Interfaces } from "../interfaces";

import { areSelectedTablesComparableAtom } from "./atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "./atoms/queryAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useBuildPlotAndTable } from "./hooks/usePlotAndTableBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { makeStatisticsTableColumns } from "./utils/makeStatisticsTableColumns";
import type { StatisticsTableRowData } from "./utils/TableBuilder";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = useColorSet(props.workbenchSettings);

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);

    const plotDivRef = React.useRef<HTMLDivElement>(null);
    const plotDivBoundingRect = useElementBoundingRect(plotDivRef);

    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const showStatisticsTable = props.viewContext.useSettingsToViewInterfaceValue("showTable");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");
    const subplotBy = props.viewContext.useSettingsToViewInterfaceValue("subplotBy");
    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter, resultName, subplotBy, colorBy);

    const plotAndTableData = useBuildPlotAndTable(
        props.viewContext,
        ensembleSet,
        colorSet,
        plotDivBoundingRect.width,
        plotDivBoundingRect.height,
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
        return makeStatisticsTableColumns(statisticsTableData.subplotByLabel, statisticsTableData.colorByLabel);
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
        <StatusWrapper className="h-full" isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
            <div className="flex h-full min-h-0 flex-col">
                <div ref={plotDivRef} className="flex-1 overflow-hidden">
                    <div>{plots}</div>
                </div>
                {showStatisticsTable && statisticsTableData && tableColumns && (
                    <div className="px-sm py-xs max-h-1/4 min-h-0 flex-none overflow-auto">
                        <Table.Root fixed compact size="small" height={"100%"}>
                            <Table.Head sticky>
                                {tableColumns.map((col) => (
                                    <Table.Column key={col.columnId} widthInPercent={col.sizeInPercent}>
                                        {col.label}
                                    </Table.Column>
                                ))}
                            </Table.Head>
                            <Table.Body>
                                <TableCompositions.VirtualizedRows rows={statisticsTableData.rows}>
                                    {(row) => (
                                        <Table.Row key={row.id}>
                                            {tableColumns.map((col) => (
                                                <TableCell
                                                    key={col.columnId}
                                                    row={row}
                                                    value={row[col.columnId]}
                                                    columnId={col.columnId}
                                                    colorMap={statisticsTableData.colorMap}
                                                />
                                            ))}
                                        </Table.Row>
                                    )}
                                </TableCompositions.VirtualizedRows>
                            </Table.Body>
                        </Table.Root>
                    </div>
                )}
            </div>
        </StatusWrapper>
    );
}

function TableCell<TK extends keyof StatisticsTableRowData>(props: {
    value: StatisticsTableRowData[TK];
    columnId: TK;
    row: StatisticsTableRowData;
    colorMap: Map<string, string>;
}) {
    if (props.columnId === "colorByValue") {
        const rowColor = props.colorMap.get(props.row.colorByKey);
        return (
            <Table.Cell>
                <div className="gap-xs flex items-center">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: rowColor }} />
                    <span>{props.value}</span>
                </div>
            </Table.Cell>
        );
    }

    return <Table.Cell>{props.value}</Table.Cell>;
}
