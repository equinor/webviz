import { describe, expect, test } from "vitest";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SensitivityCaseRef } from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import {
    findTableDataForSource,
    makeSourceLabels,
    type WaterfallSource,
} from "@modules/InplaceVolumesComparison/view/utils/waterfallSources";

const CASE_UUID = "11111111-2222-3333-8444-555555555555";
const OTHER_CASE_UUID = "66666666-7777-4888-9999-000000000000";

function makeTableData(
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    marker: string,
    sensitivityCase?: SensitivityCaseRef | null,
) {
    return { ensembleIdent, tableName, marker, sensitivityCase };
}

function makeSource(
    ensembleIdent: RegularEnsembleIdent,
    tableName: string,
    sensitivityCase: SensitivityCaseRef | null = null,
): WaterfallSource {
    return { ensembleIdent, tableName, sensitivityCase };
}

describe("findTableDataForSource", () => {
    test("distinguishes two tables from the same ensemble", () => {
        const ensembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const tablesData = [
            makeTableData(ensembleIdent, "geogrid", "reference"),
            makeTableData(ensembleIdent, "simgrid", "comparison"),
        ];

        expect(findTableDataForSource(tablesData, makeSource(ensembleIdent, "geogrid"))?.marker).toBe("reference");
        expect(findTableDataForSource(tablesData, makeSource(ensembleIdent, "simgrid"))?.marker).toBe("comparison");
    });

    test("distinguishes the same table across two ensembles", () => {
        const referenceEnsembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const comparisonEnsembleIdent = new RegularEnsembleIdent(OTHER_CASE_UUID, "iter-0");
        const tablesData = [
            makeTableData(referenceEnsembleIdent, "geogrid", "reference"),
            makeTableData(comparisonEnsembleIdent, "geogrid", "comparison"),
        ];

        expect(findTableDataForSource(tablesData, makeSource(referenceEnsembleIdent, "geogrid"))?.marker).toBe(
            "reference",
        );
        expect(findTableDataForSource(tablesData, makeSource(comparisonEnsembleIdent, "geogrid"))?.marker).toBe(
            "comparison",
        );
    });

    test("returns undefined when the table is not present for the ensemble", () => {
        const ensembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const tablesData = [makeTableData(ensembleIdent, "geogrid", "reference")];

        expect(findTableDataForSource(tablesData, makeSource(ensembleIdent, "simgrid"))).toBeUndefined();
    });

    test("distinguishes two sensitivity cases of the same ensemble and table", () => {
        const ensembleIdent = new RegularEnsembleIdent(CASE_UUID, "iter-0");
        const seedCase = { sensitivityName: "rms_seed", caseName: "p10_p90" };
        const highCase = { sensitivityName: "faults", caseName: "high" };
        const tablesData = [
            makeTableData(ensembleIdent, "geogrid", "reference", seedCase),
            makeTableData(ensembleIdent, "geogrid", "comparison", highCase),
        ];

        expect(findTableDataForSource(tablesData, makeSource(ensembleIdent, "geogrid", seedCase))?.marker).toBe(
            "reference",
        );
        expect(findTableDataForSource(tablesData, makeSource(ensembleIdent, "geogrid", highCase))?.marker).toBe(
            "comparison",
        );
        expect(findTableDataForSource(tablesData, makeSource(ensembleIdent, "geogrid"))).toBeUndefined();
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

    test("appends the sensitivity case of each side that has one", () => {
        const labels = makeSourceLabels(
            { ensembleName: "iter-0", tableName: "geogrid", caseLabel: "rms_seed" },
            { ensembleName: "iter-0", tableName: "geogrid", caseLabel: "faults:high" },
        );
        expect(labels).toEqual({ referenceLabel: "iter-0 · rms_seed", comparisonLabel: "iter-0 · faults:high" });

        const mixed = makeSourceLabels(
            { ensembleName: "iter-0", tableName: "geogrid", caseLabel: null },
            { ensembleName: "iter-1", tableName: "simgrid", caseLabel: "faults:high" },
        );
        expect(mixed).toEqual({
            referenceLabel: "iter-0 · geogrid",
            comparisonLabel: "iter-1 · simgrid · faults:high",
        });
    });
});
