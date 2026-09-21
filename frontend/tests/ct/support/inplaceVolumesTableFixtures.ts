import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import type { TableColumnsConfig, TableRow } from "@modules/InplaceVolumesTable/view/types";

const ZONES = ["Valysar", "Therys", "Volon"];

export type InplaceVolumesTableFixture = {
    columnsConfig: TableColumnsConfig;
    rows: TableRow<TableColumnsConfig>[];
};

/** Realization mode fixture: ENSEMBLE, TABLE_NAME, FLUID, REAL, ZONE, STOIIP leaf columns. */
export function makeRealizationFixture(numRows: number): InplaceVolumesTableFixture {
    const columnsConfig: TableColumnsConfig = {
        ENSEMBLE: { label: "ENSEMBLE", sizeInPercent: 100 / 6, columnType: ColumnType.ENSEMBLE },
        TABLE_NAME: { label: "TABLE_NAME", sizeInPercent: 100 / 6, columnType: ColumnType.TABLE },
        FLUID: { label: "FLUID", sizeInPercent: 100 / 6, columnType: ColumnType.FLUID },
        REAL: { label: "REAL", sizeInPercent: 100 / 6, columnType: ColumnType.REAL },
        ZONE: { label: "ZONE", sizeInPercent: 100 / 6, columnType: ColumnType.INDEX },
        STOIIP: { label: "STOIIP", sizeInPercent: 100 / 6, columnType: ColumnType.RESULT },
    };

    const rows: TableRow<TableColumnsConfig>[] = Array.from({ length: numRows }, (_, i) => ({
        __id: `row-${i}`,
        ENSEMBLE: "ens1",
        TABLE_NAME: "geogrid",
        FLUID: "oil",
        REAL: i,
        ZONE: ZONES[i % ZONES.length],
        STOIIP: i * 1.5,
    }));

    return { columnsConfig, rows };
}

/** Statistical mode fixture: ENSEMBLE, TABLE_NAME, FLUID, ZONE non-statistical columns, STOIIP {Mean,P10,P90}. */
export function makeStatisticalFixture(numRows: number): InplaceVolumesTableFixture {
    const columnsConfig: TableColumnsConfig = {
        ENSEMBLE: { label: "ENSEMBLE", sizeInPercent: 20, columnType: ColumnType.ENSEMBLE },
        TABLE_NAME: { label: "TABLE_NAME", sizeInPercent: 20, columnType: ColumnType.TABLE },
        FLUID: { label: "FLUID", sizeInPercent: 20, columnType: ColumnType.FLUID },
        ZONE: { label: "ZONE", sizeInPercent: 20, columnType: ColumnType.INDEX },
        STOIIP: {
            label: "STOIIP",
            sizeInPercent: 20,
            subHeading: {
                "STOIIP-Mean": { label: "Mean", sizeInPercent: 100 / 3, columnType: ColumnType.RESULT },
                "STOIIP-P10": { label: "P10", sizeInPercent: 100 / 3, columnType: ColumnType.RESULT },
                "STOIIP-P90": { label: "P90", sizeInPercent: 100 / 3, columnType: ColumnType.RESULT },
            },
        },
    };

    const rows: TableRow<TableColumnsConfig>[] = Array.from({ length: numRows }, (_, i) => ({
        __id: `row-${i}`,
        ENSEMBLE: "ens1",
        TABLE_NAME: "geogrid",
        FLUID: "oil",
        ZONE: ZONES[i % ZONES.length],
        "STOIIP-Mean": i * 1.1,
        "STOIIP-P10": i * 0.9,
        "STOIIP-P90": i * 1.3,
    }));

    return { columnsConfig, rows };
}
