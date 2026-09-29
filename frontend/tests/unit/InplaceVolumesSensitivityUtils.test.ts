import { describe, expect, test } from "vitest";

import type {
    InplaceVolumesTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    RepeatedTableColumnData_api,
} from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import type { Sensitivity } from "@framework/EnsembleSensitivities";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { expandSelectorColumn } from "@modules/_shared/InplaceVolumes/selectorColumnUtils";
import {
    addSensitivityColumnToPerRealizationData,
    addSensitivityColumnToPerRealizationDataMemoized,
    createSensitivityCaseColorMap,
    filterValidSensitivityCases,
    getRealizationsForSensitivityCases,
    getSensitivityCaseRefs,
    isSameSensitivityCase,
    makeRealizationToSensitivityCaseLabelMap,
    makeSensitivityCaseLabel,
    makeSensitivityCaseLabelOrder,
    resolveSensitivityMode,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";

const SENSITIVITY_ARR: Sensitivity[] = [
    { name: "rms_seed", type: SensitivityType.MONTECARLO, cases: [{ name: "p10_p90", realizations: [0, 1, 2] }] },
    {
        name: "faults",
        type: SensitivityType.SCENARIO,
        cases: [
            { name: "low", realizations: [3] },
            { name: "high", realizations: [4] },
        ],
    },
];
const SENSITIVITIES = new EnsembleSensitivities(SENSITIVITY_ARR);

function makeSelectorColumn(columnName: string, values: (string | number)[]): RepeatedTableColumnData_api {
    const uniqueValues = Array.from(new Set(values));
    const valueToIndex = new Map(uniqueValues.map((value, index) => [value, index]));
    return { columnName, uniqueValues, indices: values.map((value) => valueToIndex.get(value)!) };
}

function makeEnsemble(caseUuid: string, sensitivities: Sensitivity[] | null): RegularEnsemble {
    return new RegularEnsemble(
        "DROGON",
        ["DROGON"],
        caseUuid,
        `case-${caseUuid}`,
        "iter-0",
        "sc",
        [0, 1, 2, 3, 4],
        [],
        sensitivities,
        null,
        "",
    );
}

const SENS_ENSEMBLE = makeEnsemble("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", SENSITIVITY_ARR);
const PLAIN_ENSEMBLE = makeEnsemble("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", null);
const OTHER_PLAIN_ENSEMBLE = makeEnsemble("33333333-aaaa-4444-aaaa-aaaaaaaaaaaa", null);

describe("sensitivity case labels and refs", () => {
    test("scenario labels include the case, montecarlo labels only the sensitivity", () => {
        expect(makeSensitivityCaseLabel(SENSITIVITY_ARR[1], "low")).toBe("faults:low");
        expect(makeSensitivityCaseLabel(SENSITIVITY_ARR[0], "p10_p90")).toBe("rms_seed");
    });

    test("refs and label order follow the ensemble", () => {
        const refs = getSensitivityCaseRefs(SENSITIVITIES);
        expect(refs).toEqual([
            { sensitivityName: "rms_seed", caseName: "p10_p90" },
            { sensitivityName: "faults", caseName: "low" },
            { sensitivityName: "faults", caseName: "high" },
        ]);

        const shuffled = [refs[2], refs[0]];
        expect(makeSensitivityCaseLabelOrder(SENSITIVITIES, shuffled)).toEqual(["rms_seed", "faults:high"]);
        expect(filterValidSensitivityCases(shuffled, refs)).toEqual([refs[0], refs[2]]);
    });

    test("filterValidSensitivityCases drops unavailable cases", () => {
        const refs = getSensitivityCaseRefs(SENSITIVITIES);
        const unknown = { sensitivityName: "faults", caseName: "mid" };
        expect(filterValidSensitivityCases([unknown, refs[1]], refs)).toEqual([refs[1]]);
    });

    test("isSameSensitivityCase compares by value and handles null", () => {
        expect(
            isSameSensitivityCase({ sensitivityName: "a", caseName: "b" }, { sensitivityName: "a", caseName: "b" }),
        ).toBe(true);
        expect(
            isSameSensitivityCase({ sensitivityName: "a", caseName: "b" }, { sensitivityName: "a", caseName: "c" }),
        ).toBe(false);
        expect(isSameSensitivityCase(null, null)).toBe(true);
        expect(isSameSensitivityCase(null, { sensitivityName: "a", caseName: "b" })).toBe(false);
    });

    test("realizations are the sorted union of the selected cases", () => {
        const cases = [
            { sensitivityName: "faults", caseName: "high" },
            { sensitivityName: "rms_seed", caseName: "p10_p90" },
        ];
        expect(getRealizationsForSensitivityCases(SENSITIVITIES, cases)).toEqual([0, 1, 2, 4]);
    });

    test("realization to label map ignores unselected cases", () => {
        const map = makeRealizationToSensitivityCaseLabelMap(SENSITIVITIES, [
            { sensitivityName: "faults", caseName: "low" },
        ]);
        expect(Array.from(map.entries())).toEqual([[3, "faults:low"]]);
    });
});

describe("addSensitivityColumnToPerRealizationData", () => {
    const realizationToLabel = makeRealizationToSensitivityCaseLabelMap(SENSITIVITIES, [
        { sensitivityName: "rms_seed", caseName: "p10_p90" },
        { sensitivityName: "faults", caseName: "high" },
    ]);

    function makeData(): InplaceVolumesTableDataPerFluidSelection_api {
        const oil: InplaceVolumesTableData_api = {
            fluidSelection: "oil",
            selectorColumns: [
                makeSelectorColumn("REAL", [0, 3, 4, 0, 3, 4]),
                makeSelectorColumn("ZONE", ["A", "A", "A", "B", "B", "B"]),
            ],
            resultColumns: [{ columnName: "STOIIP", columnValues: [1, 2, 3, 4, 5, 6] }],
        };
        const gas: InplaceVolumesTableData_api = {
            fluidSelection: "gas",
            selectorColumns: [makeSelectorColumn("REAL", [0, 3])],
            resultColumns: [],
        };
        return { tableDataPerFluidSelection: [oil, gas] };
    }

    test("inserts SENSITIVITY first and drops rows without a case from every column", () => {
        const data = makeData();
        const result = addSensitivityColumnToPerRealizationData(data, realizationToLabel);

        expect(result.numDroppedRows).toBe(2);
        const oil = result.data.tableDataPerFluidSelection[0];
        expect(oil.selectorColumns.map((column) => column.columnName)).toEqual(["SENSITIVITY", "REAL", "ZONE"]);
        expect(expandSelectorColumn(oil.selectorColumns[0])).toEqual([
            "rms_seed",
            "faults:high",
            "rms_seed",
            "faults:high",
        ]);
        expect(expandSelectorColumn(oil.selectorColumns[1])).toEqual([0, 4, 0, 4]);
        expect(expandSelectorColumn(oil.selectorColumns[2])).toEqual(["A", "A", "B", "B"]);
        expect(oil.resultColumns[0].columnValues).toEqual([1, 3, 4, 6]);
    });

    test("keeps fluid selections without result columns untouched", () => {
        const data = makeData();
        const result = addSensitivityColumnToPerRealizationData(data, realizationToLabel);
        expect(result.data.tableDataPerFluidSelection[1]).toBe(data.tableDataPerFluidSelection[1]);
    });

    test("does not mutate the input", () => {
        const data = makeData();
        const snapshot = structuredClone(data);
        addSensitivityColumnToPerRealizationData(data, realizationToLabel);
        expect(data).toEqual(snapshot);
    });

    test("memoized variant returns the same object for the same inputs", () => {
        const data = makeData();
        const first = addSensitivityColumnToPerRealizationDataMemoized(data, realizationToLabel);
        const second = addSensitivityColumnToPerRealizationDataMemoized(data, realizationToLabel);
        expect(second).toBe(first);

        const otherMap = new Map(realizationToLabel);
        expect(addSensitivityColumnToPerRealizationDataMemoized(data, otherMap)).not.toBe(first);
    });
});

describe("resolveSensitivityMode", () => {
    const ensembleSet = new EnsembleSet(
        [SENS_ENSEMBLE, PLAIN_ENSEMBLE, OTHER_PLAIN_ENSEMBLE],
        [
            new DeltaEnsemble(SENS_ENSEMBLE, PLAIN_ENSEMBLE, "", null),
            new DeltaEnsemble(PLAIN_ENSEMBLE, OTHER_PLAIN_ENSEMBLE, "", null),
        ],
    );
    const [sensDelta, plainDelta] = ensembleSet.getDeltaEnsembleArray();

    test("off without sensitivities", () => {
        expect(resolveSensitivityMode(ensembleSet, [PLAIN_ENSEMBLE.getIdent()]).kind).toBe("off");
        expect(resolveSensitivityMode(ensembleSet, [PLAIN_ENSEMBLE.getIdent(), plainDelta.getIdent()]).kind).toBe(
            "off",
        );
    });

    test("active for a single regular ensemble with sensitivities", () => {
        const mode = resolveSensitivityMode(ensembleSet, [SENS_ENSEMBLE.getIdent()]);
        expect(mode.kind).toBe("active");
        expect(mode.kind === "active" && mode.ensemble).toBe(SENS_ENSEMBLE);
    });

    test("blocked with two regular ensembles", () => {
        expect(resolveSensitivityMode(ensembleSet, [SENS_ENSEMBLE.getIdent(), PLAIN_ENSEMBLE.getIdent()]).kind).toBe(
            "blocked",
        );
    });

    test("blocked with a delta whose constituent has sensitivities", () => {
        expect(resolveSensitivityMode(ensembleSet, [sensDelta.getIdent()]).kind).toBe("blocked");
    });
});

describe("createSensitivityCaseColorMap", () => {
    const colors = ["#1f77b4", "#ff7f0e", "#2ca02c"];
    const makeColorSet = () => new ColorSet(new ColorPalette({ id: "test", name: "Test", colors }));

    test("first case gets the shared base colour and cases of one sensitivity differ", () => {
        const colorMap = createSensitivityCaseColorMap(SENSITIVITIES, makeColorSet());

        // Sorted names: faults, rms_seed.
        expect(colorMap.get("faults:low")).toBe(colors[0]);
        expect(colorMap.get("rms_seed")).toBe(colors[1]);
        expect(colorMap.get("faults:high")).not.toBe(colorMap.get("faults:low"));
        expect(colorMap.get("faults:high")).toMatch(/^#[0-9a-f]{6}$/);
    });
});
