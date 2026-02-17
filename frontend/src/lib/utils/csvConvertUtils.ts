export type CsvFile = { filename: string; csvContent: string };

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
export function convertRowsToCsvContentString(headerRows: string[][], dataRows: (string | number)[][]): string {
    const allRows = [
        ...headerRows.map((row) => row.map(escapeCsvValue).join(",")),
        ...dataRows.map((row) => row.map(escapeCsvValue).join(",")),
    ];
    return allRows.join("\n");
}
