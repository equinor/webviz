import { describe, expect, test } from "vitest";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    findTableDataForSource,
    makeSourceLabels,
} from "@modules/InplaceVolumesComparison/view/utils/waterfallSources";

const CASE_UUID = "11111111-2222-3333-8444-555555555555";
const OTHER_CASE_UUID = "66666666-7777-4888-9999-000000000000";

function makeTableData(ensembleIdent: RegularEnsembleIdent, tableName: string, marker: string) {
    return { ensembleIdent, tableName, marker };
}

describe("findTableDataForSource", () => {
    test("distinguishes two tables from the same ensemble", () => {
        const ensembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const tablesData = [
            makeTableData(ensembleIdent, "geogrid", "reference"),
            makeTableData(ensembleIdent, "simgrid", "comparison"),
        ];

        expect(findTableDataForSource(tablesData, { ensembleIdent, tableName: "geogrid" })?.marker).toBe("reference");
        expect(findTableDataForSource(tablesData, { ensembleIdent, tableName: "simgrid" })?.marker).toBe("comparison");
    });

    test("distinguishes the same table across two ensembles", () => {
        const referenceEnsembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const comparisonEnsembleIdent = new RegularEnsembleIdent(OTHER_CASE_UUID, "iter-0");
        const tablesData = [
            makeTableData(referenceEnsembleIdent, "geogrid", "reference"),
            makeTableData(comparisonEnsembleIdent, "geogrid", "comparison"),
        ];

        expect(
            findTableDataForSource(tablesData, { ensembleIdent: referenceEnsembleIdent, tableName: "geogrid" })?.marker,
        ).toBe("reference");
        expect(
            findTableDataForSource(tablesData, { ensembleIdent: comparisonEnsembleIdent, tableName: "geogrid" })
                ?.marker,
        ).toBe("comparison");
    });

    test("returns undefined when the table is not present for the ensemble", () => {
        const ensembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const tablesData = [makeTableData(ensembleIdent, "geogrid", "reference")];

        expect(findTableDataForSource(tablesData, { ensembleIdent, tableName: "simgrid" })).toBeUndefined();
    });
});

describe("makeSourceLabels", () => {
    test("omits the table name when both sides use the same table", () => {
        const labels = makeSourceLabels(
            { ensembleName: "iter-0", tableName: "geogrid" },
            { ensembleName: "iter-3", tableName: "geogrid" },
        );
        expect(labels).toEqual({ referenceLabel: "iter-0", comparisonLabel: "iter-3" });
    });

    test("includes the table name when the tables differ", () => {
        const labels = makeSourceLabels(
            { ensembleName: "iter-0", tableName: "geogrid" },
            { ensembleName: "iter-0", tableName: "simgrid" },
        );
        expect(labels).toEqual({
            referenceLabel: "iter-0 · geogrid",
            comparisonLabel: "iter-0 · simgrid",
        });
    });
});
