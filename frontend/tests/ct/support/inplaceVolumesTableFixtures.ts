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

export const ALL_STATISTIC_LABELS = ["Mean", "Stddev", "P10", "P90", "Min", "Max"];
export const FOUR_RESULT_NAMES = ["STOIIP", "GIIP", "BULK", "PORV"];

const TABLE_NAMES = ["geogrid", "simgrid"];

/**
 * Statistical fixture shaped like the real builder output: constant ENSEMBLE and FLUID, two TABLE_NAMEs,
 * three ZONEs, and one group per result with `${result}-${stat}` leaves.
 */
export function makeWideStatisticalFixture(
    numRows: number,
    resultNames: string[],
    statisticLabels: string[],
): InplaceVolumesTableFixture {
    const columnsConfig: TableColumnsConfig = {
        ENSEMBLE: { label: "ENSEMBLE", columnType: ColumnType.ENSEMBLE },
        TABLE_NAME: { label: "TABLE_NAME", columnType: ColumnType.TABLE },
        FLUID: { label: "FLUID", columnType: ColumnType.FLUID },
        ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
    };
    for (const resultName of resultNames) {
        const subHeading: TableColumnsConfig = {};
        for (const statistic of statisticLabels) {
            subHeading[`${resultName}-${statistic}`] = {
                label: statistic,
                columnType: ColumnType.RESULT,
                hoverText: `${statistic} - ${resultName}`,
            };
        }
        columnsConfig[resultName] = { label: resultName, hoverText: resultName, subHeading };
    }

    const rows: TableRow<TableColumnsConfig>[] = Array.from({ length: numRows }, (_, i) => {
        const row: TableRow<TableColumnsConfig> = {
            __id: `row-${i}`,
            ENSEMBLE: "ens1",
            TABLE_NAME: TABLE_NAMES[Math.floor(i / ZONES.length) % TABLE_NAMES.length],
            FLUID: "gas + oil + water",
            ZONE: ZONES[i % ZONES.length],
        };
        resultNames.forEach((resultName, resultIndex) => {
            statisticLabels.forEach((statistic, statisticIndex) => {
                // Wide, signed values ("-123 T") are the worst case for truncation
                const sign = (i + statisticIndex) % 2 === 0 ? -1 : 1;
                row[`${resultName}-${statistic}`] = sign * 123.456e12 * (1 + 0.01 * (resultIndex + statisticIndex));
            });
        });
        return row;
    });

    return { columnsConfig, rows };
}

/**
 * "Responses as rows" fixture shaped like the long-format builder output: the identifier columns of
 * `makeWideStatisticalFixture`, then RESPONSE, then one flat column per statistic.
 */
export function makeResponsesAsRowsFixture(
    numBaseRows: number,
    resultNames: string[],
    statisticLabels: string[],
): InplaceVolumesTableFixture {
    const columnsConfig: TableColumnsConfig = {
        ENSEMBLE: { label: "ENSEMBLE", columnType: ColumnType.ENSEMBLE },
        TABLE_NAME: { label: "TABLE_NAME", columnType: ColumnType.TABLE },
        FLUID: { label: "FLUID", columnType: ColumnType.FLUID },
        ZONE: { label: "ZONE", columnType: ColumnType.INDEX },
        RESPONSE: { label: "RESPONSE", columnType: ColumnType.INDEX },
    };
    for (const statistic of statisticLabels) {
        columnsConfig[statistic] = { label: statistic, columnType: ColumnType.RESULT, hoverText: statistic };
    }

    const rows: TableRow<TableColumnsConfig>[] = [];
    for (let i = 0; i < numBaseRows; i++) {
        resultNames.forEach((resultName, resultIndex) => {
            const row: TableRow<TableColumnsConfig> = {
                __id: `row-${i}-${resultName}`,
                ENSEMBLE: "ens1",
                TABLE_NAME: TABLE_NAMES[Math.floor(i / ZONES.length) % TABLE_NAMES.length],
                FLUID: "gas + oil + water",
                ZONE: ZONES[i % ZONES.length],
                RESPONSE: resultName,
            };
            statisticLabels.forEach((statistic, statisticIndex) => {
                // Scrambled per base row and interleaved across responses, so an unscoped sort would mix responses
                row[statistic] = ((i * 5) % numBaseRows) * 10 + resultIndex + statisticIndex * 0.1;
            });
            rows.push(row);
        });
    }

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
