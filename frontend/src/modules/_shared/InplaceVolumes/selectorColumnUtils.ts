import type { RepeatedTableColumnData_api } from "@api";

/** Extract the per-row values of a repeated (run-length encoded) selector column. */
export function expandSelectorColumn(selectorColumn: RepeatedTableColumnData_api): (string | number)[] {
    return selectorColumn.indices.map((index) => selectorColumn.uniqueValues[index]);
}

/** Re-encode a list of per-row values into the repeated selector column format. */
export function encodeSelectorColumn(columnName: string, rowValues: (string | number)[]): RepeatedTableColumnData_api {
    const uniqueValues: (string | number)[] = [];
    const uniqueValueToIndex = new Map<string | number, number>();
    const indices: number[] = [];

    for (const value of rowValues) {
        let uniqueIndex = uniqueValueToIndex.get(value);
        if (uniqueIndex === undefined) {
            uniqueIndex = uniqueValues.length;
            uniqueValues.push(value);
            uniqueValueToIndex.set(value, uniqueIndex);
        }
        indices.push(uniqueIndex);
    }

    return { columnName, uniqueValues, indices };
}

/**
 * Build a composite row key from the selector column values at a given row index.
 * Uses JSON encoding to avoid delimiter collisions between selector values.
 */
export function makeRowKey(
    selectorRowValues: Map<string, (string | number)[]>,
    selectorColumnNames: string[],
    row: number,
): string {
    return JSON.stringify(selectorColumnNames.map((name) => selectorRowValues.get(name)![row]));
}
