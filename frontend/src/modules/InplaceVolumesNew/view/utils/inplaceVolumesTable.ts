import type { InplaceVolumesTableDataPerFluidSelection_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

type ColumnValue = string | number | RegularEnsembleIdent | null;

/**
 * Entry returned when grouping table data
 */
export type GroupedTableEntry = {
    /** Combined key (e.g., "Zone1|Facies2") for multi-column groups */
    key: string;
    /** Individual values for each grouping column (e.g., ["Zone1", "Facies2"]) */
    keyParts: ColumnValue[];
    /** Filtered table containing only rows for this group */
    table: InplaceVolumesTable;
};

export class InplaceVolumesTable {
    private columns: Map<string, ColumnValue[]>;
    private rowCount: number;

    private constructor(columns: Map<string, ColumnValue[]>, rowCount: number) {
        this.columns = columns;
        this.rowCount = rowCount;
    }

    static fromApiData(
        data: Array<{
            ensembleIdent: RegularEnsembleIdent;
            tableName: string;
            data: InplaceVolumesTableDataPerFluidSelection_api;
        }>,
    ): InplaceVolumesTable {
        const columns = new Map<string, ColumnValue[]>();

        // Initialize metadata columns
        columns.set("ENSEMBLE", []);
        columns.set("TABLE_NAME", []);
        columns.set("FLUID", []);

        let rowCount = 0;

        for (const tableSet of data) {
            for (const perFluidTable of tableSet.data.tableDataPerFluidSelection) {
                // Initialize selector columns
                for (const selectorColumn of perFluidTable.selectorColumns) {
                    if (!columns.has(selectorColumn.columnName)) {
                        columns.set(selectorColumn.columnName, []);
                    }
                }

                // Initialize result columns
                for (const resultColumn of perFluidTable.resultColumns) {
                    if (!columns.has(resultColumn.columnName)) {
                        columns.set(resultColumn.columnName, []);
                    }
                }

                // Add rows
                const numRows =
                    perFluidTable.selectorColumns[0]?.indices.length ||
                    perFluidTable.resultColumns[0]?.columnValues.length ||
                    0;

                for (let i = 0; i < numRows; i++) {
                    // Add selector values
                    for (const selectorColumn of perFluidTable.selectorColumns) {
                        const value = selectorColumn.uniqueValues[selectorColumn.indices[i]];
                        columns.get(selectorColumn.columnName)!.push(value);
                    }

                    // Add result values
                    for (const resultColumn of perFluidTable.resultColumns) {
                        columns.get(resultColumn.columnName)!.push(resultColumn.columnValues[i]);
                    }

                    // Add metadata
                    columns.get("ENSEMBLE")!.push(tableSet.ensembleIdent);
                    columns.get("TABLE_NAME")!.push(tableSet.tableName);
                    columns.get("FLUID")!.push(perFluidTable.fluidSelection);

                    rowCount++;
                }

                // Fill missing values in untouched columns
                for (const colValues of columns.values()) {
                    while (colValues.length < rowCount) {
                        colValues.push(null);
                    }
                }
            }
        }

        return new InplaceVolumesTable(columns, rowCount);
    }

    getColumn(name: string): ColumnValue[] | undefined {
        return this.columns.get(name);
    }

    /**
     * Split table by columns
     * Each entry has the key, key parts, and filtered table together
     */
    splitByColumns(columnNames: string[]): GroupedTableEntry[] {
        const groups = this.groupByColumns(columnNames);
        const entries: GroupedTableEntry[] = [];

        for (const [key, { indices, values }] of groups) {
            entries.push({
                key,
                keyParts: values,
                table: this.filterByIndices(indices),
            });
        }

        return entries;
    }

    /**
     * Split by a single column
     */
    splitByColumn(columnName: string): GroupedTableEntry[] {
        return this.splitByColumns([columnName]);
    }

    /**
     * Make grouped tables iterable
     * Usage: for (const { key, table } of table.iterateByColumns(columns)) { ... }
     */
    *iterateByColumns(columnNames: string[]): Generator<GroupedTableEntry> {
        const groups = this.groupByColumns(columnNames);

        for (const [key, { indices, values }] of groups) {
            yield {
                key,
                keyParts: values,
                table: this.filterByIndices(indices),
            };
        }
    }

    /**
     * Group rows by multiple columns
     * Returns Map of combined keys to row indices and values
     */
    private groupByColumns(columnNames: string[]): Map<string, { indices: number[]; values: ColumnValue[] }> {
        const groups = new Map<string, { indices: number[]; values: ColumnValue[] }>();

        // Get all columns upfront
        const columnArrays = columnNames.map((name) => this.columns.get(name));

        // Check if all columns exist
        if (columnArrays.some((col) => !col)) {
            return groups;
        }

        for (let i = 0; i < this.rowCount; i++) {
            // Build combined key and collect individual values
            const values: ColumnValue[] = [];
            let hasNull = false;

            for (const column of columnArrays) {
                const value = column![i];
                if (value === null) {
                    hasNull = true;
                    break;
                }
                values.push(value);
            }

            if (hasNull) continue;

            // Use pipe separator to create unique combined key
            const combinedKey = values.map((v) => v!.toString()).join("|");

            if (!groups.has(combinedKey)) {
                groups.set(combinedKey, { indices: [], values });
            }
            groups.get(combinedKey)!.indices.push(i);
        }

        return groups;
    }

    /**
     * Create a filtered view with only specified rows
     */
    filterByIndices(indices: number[]): InplaceVolumesTable {
        const newColumns = new Map<string, ColumnValue[]>();

        for (const [colName, colValues] of this.columns) {
            newColumns.set(
                colName,
                indices.map((i) => colValues[i]),
            );
        }

        return new InplaceVolumesTable(newColumns, indices.length);
    }

    /**
     * Get the number of rows
     */
    getRowCount(): number {
        return this.rowCount;
    }

    /**
     * Get all column names
     */
    getColumnNames(): string[] {
        return Array.from(this.columns.keys());
    }

    /**
     * Check if a column exists
     */
    hasColumn(name: string): boolean {
        return this.columns.has(name);
    }
}
