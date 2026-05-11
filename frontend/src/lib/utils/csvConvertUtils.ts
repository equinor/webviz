export type CsvFile = { filename: string; csvContent: string };
export type CsvRows = { headerRows: string[][]; dataRows: (string | number)[][] };

/**
 * Escape a CSV value: wrap in double quotes if it contains commas, quotes, or newlines.
 * Inner double quotes are escaped by doubling them.
 */
export function escapeCsvValue(value: string | number): string {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Convert header rows and data rows into a CSV content string.
 *
 * Supports multi-row headers (e.g. two-row headers for statistics CSV).
 * Each row is joined with commas, rows are joined with newlines.
 * Values are escaped as needed.
 */
export function convertRowsToCsvContentString(rows: CsvRows): string {
    const allRows = [
        ...rows.headerRows.map((row) => row.map(escapeCsvValue).join(",")),
        ...rows.dataRows.map((row) => row.map(escapeCsvValue).join(",")),
    ];
    return allRows.join("\n");
}
