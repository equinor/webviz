import { describe, expect, test } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { convertRowsToCsvContentString } from "@lib/utils/csvConvertUtils";
import { ColumnType } from "@modules/_shared/InplaceVolumes/Table";
import type { TableColumnsConfig, TableRow } from "@modules/InplaceVolumesTable/view/types";
import { buildCsvRowsFromTable } from "@modules/InplaceVolumesTable/view/utils/csvExportUtils";

const KNOWN_CASE_UUID = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
const UNKNOWN_CASE_UUID = "99999999-aaaa-4444-aaaa-aaaaaaaaaaaa";

const ensembleSet = new EnsembleSet([
    new RegularEnsemble("DROGON", ["DROGON"], KNOWN_CASE_UUID, "case1", "ens1", "sc1", [], [], [], null, ""),
]);

describe("buildCsvRowsFromTable", () => {
    test("realization mode: one header row of raw column names, leaf order equals config order, __id absent", () => {
        const columnsConfig: TableColumnsConfig = {
            ENSEMBLE: { label: "ENSEMBLE", sizeInPercent: 25, columnType: ColumnType.ENSEMBLE },
            REAL: { label: "REAL", sizeInPercent: 25, columnType: ColumnType.REAL },
            ZONE: { label: "ZONE", sizeInPercent: 25, columnType: ColumnType.INDEX },
            STOIIP: { label: "STOIIP", sizeInPercent: 25, columnType: ColumnType.RESULT },
        };
        const rows: TableRow<TableColumnsConfig>[] = [
            {
                __id: "1",
                ENSEMBLE: `${KNOWN_CASE_UUID}::ens1`,
                REAL: 0,
                ZONE: "Valysar",
                STOIIP: 123.456,
            },
        ];

        const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);

        expect(csvRows.headerRows).toEqual([["ENSEMBLE", "REAL", "ZONE", "STOIIP"]]);
        expect(csvRows.dataRows[0]).not.toContain("1");
        expect(csvRows.dataRows).toEqual([[expect.any(String), 0, "Valysar", 123.456]]);
    });

    test("statistical mode: exactly one header row, statistical leaves flattened, headers unique", () => {
        const columnsConfig: TableColumnsConfig = {
            ZONE: { label: "ZONE", sizeInPercent: 20, columnType: ColumnType.INDEX },
            STOIIP: {
                label: "STOIIP",
                sizeInPercent: 40,
                subHeading: {
                    "STOIIP-Mean": { label: "Mean", sizeInPercent: 50, columnType: ColumnType.RESULT },
                    "STOIIP-P10": { label: "P10", sizeInPercent: 50, columnType: ColumnType.RESULT },
                },
            },
            BULK: {
                label: "BULK",
                sizeInPercent: 40,
                subHeading: {
                    "BULK-Mean": { label: "Mean", sizeInPercent: 50, columnType: ColumnType.RESULT },
                    "BULK-P10": { label: "P10", sizeInPercent: 50, columnType: ColumnType.RESULT },
                },
            },
        };
        const rows: TableRow<TableColumnsConfig>[] = [
            {
                __id: "1",
                ZONE: "Valysar",
                "STOIIP-Mean": 100,
                "STOIIP-P10": 90,
                "BULK-Mean": 200,
                "BULK-P10": 190,
            },
        ];

        const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);

        expect(csvRows.headerRows.length).toBe(1);
        expect(csvRows.headerRows[0]).toEqual(["ZONE", "STOIIP_Mean", "STOIIP_P10", "BULK_Mean", "BULK_P10"]);
        expect(new Set(csvRows.headerRows[0]).size).toBe(csvRows.headerRows[0].length);
    });

    test("ensemble cell resolves to display name for known ident, raw string for unknown, empty for null", () => {
        const columnsConfig: TableColumnsConfig = {
            ENSEMBLE: { label: "ENSEMBLE", sizeInPercent: 100, columnType: ColumnType.ENSEMBLE },
        };
        const unknownIdentString = `${UNKNOWN_CASE_UUID}::ens1`;
        const rows: TableRow<TableColumnsConfig>[] = [
            { __id: "1", ENSEMBLE: `${KNOWN_CASE_UUID}::ens1` },
            { __id: "2", ENSEMBLE: unknownIdentString },
            { __id: "3", ENSEMBLE: null },
        ];

        const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);

        expect(csvRows.dataRows[0]).toEqual(["ens1"]);
        expect(csvRows.dataRows[1]).toEqual([unknownIdentString]);
        expect(csvRows.dataRows[2]).toEqual([""]);
    });

    test("numbers exported raw, non-finite and null become empty string", () => {
        const columnsConfig: TableColumnsConfig = {
            STOIIP: { label: "STOIIP", sizeInPercent: 100, columnType: ColumnType.RESULT },
        };
        const rows: TableRow<TableColumnsConfig>[] = [
            { __id: "1", STOIIP: 1234567.891 },
            { __id: "2", STOIIP: 0 },
            { __id: "3", STOIIP: -5.5 },
            { __id: "4", STOIIP: NaN },
            { __id: "5", STOIIP: Infinity },
            { __id: "6", STOIIP: null },
        ];

        const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);

        expect(csvRows.dataRows).toEqual([[1234567.891], [0], [-5.5], [""], [""], [""]]);
    });

    test("supplied row order is preserved", () => {
        const columnsConfig: TableColumnsConfig = {
            ZONE: { label: "ZONE", sizeInPercent: 100, columnType: ColumnType.INDEX },
        };
        const rows: TableRow<TableColumnsConfig>[] = [
            { __id: "1", ZONE: "C" },
            { __id: "2", ZONE: "A" },
            { __id: "3", ZONE: "B" },
        ];

        const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);

        expect(csvRows.dataRows).toEqual([["C"], ["A"], ["B"]]);
    });

    test("category strings with commas/quotes pass through untouched, serializer escapes them", () => {
        const columnsConfig: TableColumnsConfig = {
            ZONE: { label: "ZONE", sizeInPercent: 100, columnType: ColumnType.INDEX },
        };
        const rows: TableRow<TableColumnsConfig>[] = [{ __id: "1", ZONE: 'Valysar, "East"' }];

        const csvRows = buildCsvRowsFromTable(columnsConfig, rows, ensembleSet);

        expect(csvRows.dataRows).toEqual([['Valysar, "East"']]);
        expect(convertRowsToCsvContentString(csvRows)).toBe('ZONE\n"Valysar, ""East"""');
    });
});
