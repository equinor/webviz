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
import {
    Column,
    ColumnType,
    InplaceVolumetricsTablesDataAccessor,
} from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import {
    EnsembleIdentWithRealizations,
    useGetAggregatedTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
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
        accumulationOptions.filter((el) => el !== "fluidZone") as InplaceVolumetricsIdentifier_api[],
        !accumulationOptions.includes("fluidZone"),
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

    const tablesDataAccessor = new InplaceVolumetricsTablesDataAccessor(aggregatedTableDataQueries.tablesData);

    for (const column of tablesDataAccessor.getColumnsUnion()) {
        headings[column.name] = {
            label: column.name,
            sizeInPercent: 100 / tablesDataAccessor.getColumnsUnionCount(),
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
        };
    }

    const tableRows: TableRow<any>[] = [];

    for (const subTable of tablesDataAccessor.getTables()) {
        for (const row of subTable.getRows()) {
            tableRows.push(row);
        }
    }

    return (
        <div ref={divRef} className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center",
                    { hidden: !aggregatedTableDataQueries.isFetching && !aggregatedTableDataQueries.allQueriesFailed }
                )}
            >
                {aggregatedTableDataQueries.isFetching ? <CircularProgress size="medium" /> : "Failed to load data."}
            </div>
            <Table headings={headings} data={tableRows} height={divBoundingRect.height / 2} />
        </div>
    );
}

function makeStyleFormattingFunc(column: Column): ((value: number | string) => React.CSSProperties) | undefined {
    if (column.type === ColumnType.FLUID_ZONE) {
        return (value: number | string) => {
            if (typeof value === "number") {
                return {};
            }

            if (value === FluidZone_api.OIL) {
                return { color: "#ab110c" };
            }
            if (value === FluidZone_api.WATER) {
                return { color: "#0c24ab" };
            }
            if (value === FluidZone_api.GAS) {
                return { color: "#0b8511" };
            }

            return {};
        };
    }

    return undefined;
}

function makeValueFormattingFunc(
    column: Column,
    ensembleSet: EnsembleSet
): ((value: number | string) => string) | undefined {
    if (column.type === ColumnType.ENSEMBLE) {
        return (value: number | string) => formatEnsembleIdent(value, ensembleSet);
    }
    if (column.type === ColumnType.RESULT) {
        return formatResultValue;
    }

    return undefined;
}

function formatEnsembleIdent(value: string | number, ensembleSet: EnsembleSet): string {
    const ensemble = ensembleSet.findEnsembleByIdentString(value.toString());
    if (ensemble) {
        return makeDistinguishableEnsembleDisplayName(
            EnsembleIdent.fromString(value.toString()),
            ensembleSet.getEnsembleArr()
        );
    }
    return value.toString();
}

function formatResultValue(value: string | number): string {
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
