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
        ENSEMBLE: { label: "ENSEMBLE", columnType: ColumnType.ENSEMBLE },
        TABLE_NAME: { label: "TABLE_NAME", columnType: ColumnType.TABLE },
        FLUID: { label: "FLUID", columnType: ColumnType.FLUID },
        REAL: { label: "REAL", columnType: ColumnType.REAL },
        ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
        STOIIP: { label: "STOIIP", columnType: ColumnType.RESULT },
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
        ENSEMBLE: { label: "ENSEMBLE", columnType: ColumnType.ENSEMBLE },
        TABLE_NAME: { label: "TABLE_NAME", columnType: ColumnType.TABLE },
        FLUID: { label: "FLUID", columnType: ColumnType.FLUID },
        ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
        STOIIP: {
            label: "STOIIP",
            subHeading: {
                "STOIIP-Mean": { label: "Mean", columnType: ColumnType.RESULT },
                "STOIIP-P10": { label: "P10", columnType: ColumnType.RESULT },
                "STOIIP-P90": { label: "P90", columnType: ColumnType.RESULT },
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
