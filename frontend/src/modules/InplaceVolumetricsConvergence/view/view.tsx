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
import {
    Column,
    ColumnType,
    InplaceVolumetricsTablesDataAccessor,
} from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useGetAggregatedTableDataQueries } from "./queryHooks";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { EnsembleIdentWithRealizations } from "../typesAndEnums";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");
    const accumulationOptions = props.viewContext.useSettingsToViewInterfaceValue("accumulationOptions");
    const calcMeanAcrossAllRealizations = props.viewContext.useSettingsToViewInterfaceValue(
        "calcMeanAcrossAllRealizations"
    );

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
        resultName ? [resultName] : [],
        filter.fluidZones,
        accumulationOptions.filter((el) => el !== "fluidZones") as InplaceVolumetricsIdentifier_api[],
        accumulationOptions.includes("fluidZones"),
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

    if (aggregatedTableDataQueries.isFetching) {
        statusWriter.setLoading(true);
        return (
            <div className="w-full h-full flex items-center justify-center">
                <CircularProgress size="medium" />{" "}
            </div>
        );
    }

    if (aggregatedTableDataQueries.allQueriesFailed) {
        return <div>Failed to load data</div>;
    }

    const headings: TableHeading = {};

    const tablesDataAccesor = new InplaceVolumetricsTablesDataAccessor(aggregatedTableDataQueries.tablesData);

    for (const column of tablesDataAccesor.getColumnsUnion()) {
        headings[column.name] = {
            label: column.name,
            sizeInPercent: 100 / tablesDataAccesor.getColumnsUnionCount(),
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
        };
    }

    const tableRows: TableRow<any>[] = [];

    for (const subTable of tablesDataAccesor.getTables()) {
        for (const row of subTable.getRows()) {
            tableRows.push(row);
        }
    }

    return <Table headings={headings} data={tableRows} />;
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
