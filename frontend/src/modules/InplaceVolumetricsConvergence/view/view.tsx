import { ModuleViewProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { Table } from "@lib/components/Table";
import { TableHeading, TableRow } from "@lib/components/Table/table";

import { useGetAggregatedTableDataQueries } from "./queryHooks";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { EnsembleIdentWithRealizations } from "../typesAndEnums";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleRealizationFilter = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");

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
        false,
        true,
        filter.identifiersValues
    );

    const headings: TableHeading = {
        ensemble: {
            label: "Ensemble",
            sizeInPercent: 10,
        },
        table: {
            label: "Table",
            sizeInPercent: 10,
        },
        region: {
            label: "Region",
            sizeInPercent: 10,
        },
        zone: {
            label: "Zone",
            sizeInPercent: 10,
        },
        [resultName?.toString().toLocaleLowerCase() || ""]: {
            label: resultName?.toString() || "",
            sizeInPercent: 10,
        },
        fluidZone: {
            label: "Fluid Zone",
            sizeInPercent: 50,
        },
    };

    const tableRows: TableRow<any>[] = [];

    if (!aggregatedTableDataQueries.isFetching && !aggregatedTableDataQueries.allQueriesFailed) {
        for (const [index, table] of aggregatedTableDataQueries.tableData.entries()) {
            if (index === 0 && table.data) {
                for (const fluidZoneTable of table.data.table_per_fluid_selection) {
                    for (const [iColumn, column] of fluidZoneTable.selector_columns.entries()) {
                        for (const [i, indexValue] of column.indices.entries()) {
                            if (iColumn === 0) {
                                tableRows.push({
                                    ensemble: table.ensembleIdent.toString(),
                                    table: table.tableName,
                                    fluidZone: fluidZoneTable.fluid_selection_name,
                                });
                            }
                            const value = column.unique_values[indexValue];
                            tableRows[i][column.column_name.toLowerCase()] = value;
                        }
                    }
                    const resultName = fluidZoneTable.result_columns[0].column_name;
                    for (const [i, value] of fluidZoneTable.result_columns[0].column_values.entries()) {
                        tableRows[i][resultName.toLowerCase()] = value;
                    }
                }
            }
        }
    }

    if (aggregatedTableDataQueries.isFetching) {
        return <div>Loading...</div>;
    }

    return <Table headings={headings} data={tableRows} />;
}
