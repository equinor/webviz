import type { RepeatedTableColumnData_api } from "@api";

/** Look up the selector value for each row. */
export function expandSelectorColumn(selectorColumn: RepeatedTableColumnData_api): (string | number)[] {
    return selectorColumn.indices.map((index) => selectorColumn.uniqueValues[index]);
}

/** Store each distinct value once, with an index for each row. */
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
 * Build a row key from its selector values. JSON keeps values separate even if they contain punctuation.
 */
export function makeRowKey(
    selectorRowValues: Map<string, (string | number)[]>,
    selectorColumnNames: string[],
    row: number,
): string {
    return JSON.stringify(selectorColumnNames.map((name) => selectorRowValues.get(name)![row]));
}
