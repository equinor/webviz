import { EnsembleIdent } from "@framework/EnsembleIdent";

import { InplaceVolDataEnsembleSet, PlotGroupingEnum } from "../typesAndEnums";

type InplaceVolTableRow = {
    [key: string]: number | string | number[] | EnsembleIdent;
};

export type InplaceVolGroupedResultValues = {
    groupName: string | number;
    subgroups: InplaceVolSubgroupResultValues[];
};

type InplaceVolSubgroupResultValues = {
    subgroupName: string | number;
    resultValues: number[];
    realizations: number[];
};

export function getGroupedInplaceVolResults(
    tableCollections: InplaceVolDataEnsembleSet[],
    groupBy: PlotGroupingEnum,
    subgroupBy: string
): InplaceVolGroupedResultValues[] {
    console.time("getInplaceDataResults");
    if (groupBy !== PlotGroupingEnum.ENSEMBLE && subgroupBy !== PlotGroupingEnum.ENSEMBLE) {
        if (tableCollections.length > 1) {
            throw new Error("Only one table collection is allowed when groupBy and subgroupBy are not ENSEMBLE");
        }
    }
    const table = createTable(tableCollections);
    const groupedRows = getTableGroupingValues(table, groupBy);
    const subgroups = groupedRows.map((group) => ({
        groupName: group.key,
        subgroups: getSubgroups(group.rows, subgroupBy),
    }));
    console.timeEnd("getInplaceDataResults");
    return subgroups;
}

function getTableGroupingValues(
    table: InplaceVolTableRow[],
    groupByIndexName: keyof InplaceVolTableRow
): { key: string | number; rows: InplaceVolTableRow[] }[] {
    const acc: Record<string | number, InplaceVolTableRow[]> = {};
    table.forEach((row) => {
        const groupByValue = row[groupByIndexName];
        if (groupByValue !== undefined) {
            const key = typeof groupByValue === "number" ? groupByValue : groupByValue.toString();
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(row);
        }
    });
    return Object.entries(acc).map(([key, rows]) => ({ key, rows }));
}

function getSubgroups(
    rows: InplaceVolTableRow[],
    subgroupBy: keyof InplaceVolTableRow
): InplaceVolSubgroupResultValues[] {
    const subgroupAcc: Record<string | number, InplaceVolTableRow[]> = {};
    rows.forEach((row) => {
        const subgroupValue = row[subgroupBy];
        if (subgroupValue !== undefined) {
            const key = typeof subgroupValue === "number" ? subgroupValue : subgroupValue.toString();
            if (!subgroupAcc[key]) {
                subgroupAcc[key] = [];
            }
            subgroupAcc[key].push(row);
        }
    });

    return Object.entries(subgroupAcc).map(([subgroupName, rows]) => {
        // Realizations are the same for all rows. pickign first.
        const realizations = rows[0]["realizations"] as number[];

        return {
            subgroupName,
            resultValues: sumResultValues(rows),
            realizations: realizations,
        };
    });
}

function sumResultValues(rows: InplaceVolTableRow[]): number[] {
    let sums: number[] = [];
    rows.forEach((row) => {
        const resultValues = row["result_values"] as number[];
        resultValues.forEach((value, index) => {
            sums[index] = (sums[index] || 0) + value;
        });
    });
    return sums;
}

function createTable(tableCollections: InplaceVolDataEnsembleSet[]): InplaceVolTableRow[] {
    const table: InplaceVolTableRow[] = [];
    tableCollections.forEach((tableCollection) => {
        if (tableCollection.data) {
            const indexNames = tableCollection.data.index_names;

            tableCollection.data.entries.forEach((entry) => {
                const row: InplaceVolTableRow = {
                    Ensemble: tableCollection.ensembleIdentString,
                    realizations: tableCollection.data?.realizations || [],
                };
                entry.index_values.forEach((value, index) => {
                    row[indexNames[index]] = value;
                });
                row["result_values"] = entry.result_values;

                table.push(row);
            });
        }
    });
    return table;
}
