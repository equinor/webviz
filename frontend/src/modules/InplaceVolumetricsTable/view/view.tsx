import React from "react";

import { FluidZone_api, InplaceVolumetricsIdentifier_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Table } from "@lib/components/Table";
import { TableHeading, TableRow } from "@lib/components/Table/table";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Column, ColumnType } from "@modules/_shared/InplaceVolumetrics/Table";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumetrics/tableUtils";
import { SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultNames = props.viewContext.useSettingsToViewInterfaceValue("resultNames");
    const accumulationOptions = props.viewContext.useSettingsToViewInterfaceValue("accumulationOptions");
    const calcMeanAcrossAllRealizations = props.viewContext.useSettingsToViewInterfaceValue(
        "calcMeanAcrossAllRealizations"
    );

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[] = [];
    for (const ensembleIdent of filter.ensembleIdents) {
        ensembleIdentsWithRealizations.push({
            ensembleIdent,
            realizations: ensembleRealizationFilter(ensembleIdent),
        });
    }

    const aggregatedTableDataQueries = useGetAggregatedTableDataQueries(
        ensembleIdentsWithRealizations,
        filter.tableNames,
        resultNames,
        filter.fluidZones,
        accumulationOptions.filter((el) => el !== SourceIdentifier.FLUID_ZONE) as InplaceVolumetricsIdentifier_api[],
        !accumulationOptions.includes(SourceIdentifier.FLUID_ZONE),
        calcMeanAcrossAllRealizations,
        filter.identifiersValues
    );

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);

    if (aggregatedTableDataQueries.someQueriesFailed) {
        for (const error of aggregatedTableDataQueries.errors) {
            const helper = ApiErrorHelper.fromError(error);
            if (helper) {
                statusWriter.addError(helper.makeStatusMessage());
            }
        }
    }

    const headings: TableHeading = {};

    const dataTable = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    for (const column of dataTable.getColumns()) {
        headings[column.getName()] = {
            label: column.getName(),
            sizeInPercent: 100 / dataTable.getNumColumns(),
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
        };
    }

    const tableRows: TableRow<any>[] = [];
    for (const row of dataTable.getRows()) {
        tableRows.push(row);
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
        if (aggregatedTableDataQueries.isFetching) {
            return <CircularProgress size="medium" />;
        }

        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load data.";
        }

        return "No data to display.";
    }

    return (
        <div ref={divRef} className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center",
                    { hidden: tableRows.length > 0 }
                )}
            >
                {makeMessage()}
            </div>
            <Table headings={headings} data={tableRows} height={divBoundingRect.height} onHover={handleTableHover} />
        </div>
    );
}

function makeStyleFormattingFunc(column: Column): ((value: number | string | null) => React.CSSProperties) | undefined {
    if (column.getType() === ColumnType.FLUID_ZONE) {
        return (value: number | string | null) => {
            const style: React.CSSProperties = { textAlign: "right", fontWeight: "bold" };

            if (value === FluidZone_api.OIL) {
                style.color = "#0b8511";
            }
            if (value === FluidZone_api.WATER) {
                style.color = "#0c24ab";
            }
            if (value === FluidZone_api.GAS) {
                style.color = "#ab110c";
            }

            return style;
        };
    }

    if (column.getType() === ColumnType.ENSEMBLE) {
        return undefined;
    }

    return () => ({ textAlign: "right" });
}

function makeValueFormattingFunc(
    column: Column,
    ensembleSet: EnsembleSet
): ((value: number | string | null) => string) | undefined {
    if (column.getType() === ColumnType.ENSEMBLE) {
        return (value: number | string | null) => formatEnsembleIdent(value, ensembleSet);
    }
    if (column.getType() === ColumnType.RESULT) {
        return formatResultValue;
    }

    return undefined;
}

function formatEnsembleIdent(value: string | number | null, ensembleSet: EnsembleSet): string {
    if (value === null) {
        return "-";
    }
    const ensemble = ensembleSet.findEnsembleByIdentString(value.toString());
    if (ensemble) {
        return makeDistinguishableEnsembleDisplayName(
            EnsembleIdent.fromString(value.toString()),
            ensembleSet.getEnsembleArr()
        );
    }
    return value.toString();
}

function formatResultValue(value: string | number | null): string {
    // If properties cannot be calculated,
    // e.g. due to a 0 denominator, the value returned from backend will be null
    if (value === null) {
        return "-";
    }

    if (typeof value === "string") {
        return value;
    }

    let suffix = "";
    const log = Math.log10(Math.abs(value));
    if (log >= 6) {
        value /= 1e6;
        suffix = "M";
    } else if (log >= 3) {
        value /= 1e3;
        suffix = "k";
    }

    return `${value.toFixed(2)} ${suffix}`;
}
