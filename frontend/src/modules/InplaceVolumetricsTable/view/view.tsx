import React from "react";

import { InplaceVolumetricsIdentifier_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Table as TableComponent } from "@lib/components/Table";
import { TableHeading, TableRow } from "@lib/components/Table/table";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedPerRealizationTableDataQueries,
    useGetAggregatedStatisticalTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { SourceIdentifier, TableType } from "@modules/_shared/InplaceVolumetrics/types";

import {
    createStatisticalTableHeadingsAndRowsFromTablesData,
    createTableHeadingsAndRowsFromTablesData,
} from "./utils/tableComponentUtils";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultNames = props.viewContext.useSettingsToViewInterfaceValue("resultNames");
    const accumulationOptions = props.viewContext.useSettingsToViewInterfaceValue("accumulationOptions");
    const tableType = props.viewContext.useSettingsToViewInterfaceValue("tableType");
    const statisticOptions = props.viewContext.useSettingsToViewInterfaceValue("statisticOptions");

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of filter.ensembleIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: ensembleRealizationFilter(ensembleIdent),
        });
    }

    const perRealizationTableDataQueries = useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        filter.tableNames,
        resultNames,
        filter.fluidZones,
        accumulationOptions.filter((el) => el !== SourceIdentifier.FLUID_ZONE) as InplaceVolumetricsIdentifier_api[],
        !accumulationOptions.includes(SourceIdentifier.FLUID_ZONE),
        filter.identifiersValues,
        tableType === TableType.PER_REALIZATION
    );

    const statisticalTableDataQueries = useGetAggregatedStatisticalTableDataQueries(
        ensembleIdentsWithRealizations,
        filter.tableNames,
        resultNames,
        filter.fluidZones,
        accumulationOptions.filter((el) => el !== SourceIdentifier.FLUID_ZONE) as InplaceVolumetricsIdentifier_api[],
        !accumulationOptions.includes(SourceIdentifier.FLUID_ZONE),
        filter.identifiersValues,
        tableType === TableType.STATISTICAL
    );

    statusWriter.setLoading(perRealizationTableDataQueries.isFetching || statisticalTableDataQueries.isFetching);

    if (perRealizationTableDataQueries.someQueriesFailed) {
        for (const error of perRealizationTableDataQueries.errors) {
            const helper = ApiErrorHelper.fromError(error);
            if (helper) {
                statusWriter.addError(helper.makeStatusMessage());
            }
        }
    }
    if (statisticalTableDataQueries.someQueriesFailed) {
        for (const error of statisticalTableDataQueries.errors) {
            const helper = ApiErrorHelper.fromError(error);
            if (helper) {
                statusWriter.addError(helper.makeStatusMessage());
            }
        }
    }

    // TODO:
    // - Refactor and make usage of view atoms
    // - When atoms are in place, provide data to the table component
    // - Give info/warning if the table is missing any of the requested resultNames

    let headings: TableHeading = {};
    let tableRows: TableRow<any>[] = [];

    // Make data table based on settings
    if (tableType === TableType.PER_REALIZATION) {
        const tableHeadingsAndRows = createTableHeadingsAndRowsFromTablesData(
            perRealizationTableDataQueries.tablesData,
            ensembleSet
        );
        headings = tableHeadingsAndRows.headings;
        tableRows = tableHeadingsAndRows.rows;
    } else if (tableType === TableType.STATISTICAL) {
        const tableHeadingsAndRows = createStatisticalTableHeadingsAndRowsFromTablesData(
            statisticalTableDataQueries.tablesData,
            statisticOptions,
            ensembleSet
        );

        headings = tableHeadingsAndRows.headings;
        tableRows = tableHeadingsAndRows.rows;
    }

    const handleTableHover = React.useCallback(
        function handleTableHover(row: TableRow<TableHeading> | null) {
            if (!row) {
                props.workbenchServices.publishGlobalData("global.hoverRegion", null);
                props.workbenchServices.publishGlobalData("global.hoverZone", null);
                props.workbenchServices.publishGlobalData("global.hoverFacies", null);
                return;
            }
            if (Object.keys(row).includes(InplaceVolumetricsIdentifier_api.REGION)) {
                const regionName = row[InplaceVolumetricsIdentifier_api.REGION]?.toString();
                if (regionName) {
                    props.workbenchServices.publishGlobalData("global.hoverRegion", { regionName });
                }
            }

            if (Object.keys(row).includes(InplaceVolumetricsIdentifier_api.ZONE)) {
                const zoneName = row[InplaceVolumetricsIdentifier_api.ZONE]?.toString();
                if (zoneName) {
                    props.workbenchServices.publishGlobalData("global.hoverZone", { zoneName });
                }
            }

            if (Object.keys(row).includes(InplaceVolumetricsIdentifier_api.FACIES)) {
                const faciesName = row[InplaceVolumetricsIdentifier_api.FACIES]?.toString();
                if (faciesName) {
                    props.workbenchServices.publishGlobalData("global.hoverFacies", { faciesName });
                }
            }
        },
        [props.workbenchServices]
    );

    function makeMessage(): React.ReactNode {
        if (perRealizationTableDataQueries.isFetching) {
            return <CircularProgress size="medium" />;
        }

        if (perRealizationTableDataQueries.allQueriesFailed) {
            return "Failed to load data.";
        }

        return "No data to display.";
    }

    return (
        <div ref={divRef} className="w-full h-full relative">
            <PendingWrapper
                isPending={perRealizationTableDataQueries.isFetching || statisticalTableDataQueries.isFetching}
                errorMessage={
                    perRealizationTableDataQueries.allQueriesFailed || statisticalTableDataQueries.allQueriesFailed
                        ? "Failed to load table data"
                        : undefined
                }
            >
                <div
                    className={resolveClassNames(
                        "absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center",
                        { hidden: tableRows.length > 0 }
                    )}
                >
                    {makeMessage()}
                </div>

                <TableComponent
                    headings={headings}
                    data={tableRows}
                    height={divBoundingRect.height}
                    onHover={handleTableHover}
                />
            </PendingWrapper>
        </div>
    );
}
