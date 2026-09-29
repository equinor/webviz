import { Ajv } from "ajv/dist/jtd";
import { createStore } from "jotai";
import { describe, expect, test } from "vitest";

import { SensitivityType } from "@framework/EnsembleSensitivities";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { HistogramType } from "@modules/_shared/histogram";
import { BarSortBy } from "@modules/_shared/InplaceVolumes/plotOptions";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import {
    selectedEnsembleIdentsAtom,
    selectedSensitivityCasesAtom,
} from "@modules/InplaceVolumesNew/settings/atoms/persistableFixableAtoms";
import {
    deserializeSettings,
    SERIALIZED_SETTINGS_SCHEMA,
    serializeSettings,
    type SerializedSettings,
} from "@modules/InplaceVolumesNew/settings/persistence";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

const ENSEMBLE = new RegularEnsemble(
    "DROGON",
    ["DROGON"],
    "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case1",
    "iter-0",
    "sc",
    [0, 1, 2],
    [],
    [
        {
            name: "faults",
            type: SensitivityType.SCENARIO,
            cases: [
                { name: "low", realizations: [0, 1] },
                { name: "high", realizations: [2] },
            ],
        },
    ],
    null,
    "",
);

const OLD_SETTINGS: Omit<SerializedSettings, "sensitivityCases"> = {
    ensembleIdentStrings: [ENSEMBLE.getIdent().toString()],
    tableNames: ["geogrid"],
    indicesWithValues: [],
    resultName: "STOIIP",
    selectorColumn: null,
    groupBy: "ENSEMBLE",
    colorBy: "TABLE_NAME",
    plotType: PlotType.HISTOGRAM,
    plotOptions: {
        histogramType: HistogramType.Overlay,
        histogramBins: 10,
        barSortBy: BarSortBy.Yvalues,
        showStatisticalMarkers: false,
        showRealizationPoints: false,
        sharedXAxis: false,
        sharedYAxis: false,
        hideConstants: false,
        showPercentageInHistogram: true,
        showStatisticalLabels: false,
    },
    indexValueCriteria: IndexValueCriteria.REQUIRE_EQUALITY,
    showTable: true,
};

function makeStoreWithEnsemble() {
    const store = createStore();
    store.set(EnsembleSetAtom, new EnsembleSet([ENSEMBLE]));
    store.set(selectedEnsembleIdentsAtom, [ENSEMBLE.getIdent()]);
    return store;
}

describe("InplaceVolumesNew settings persistence", () => {
    const validate = new Ajv().compile(SERIALIZED_SETTINGS_SCHEMA);

    test("schema accepts old settings without sensitivity cases", () => {
        expect(validate(OLD_SETTINGS)).toBe(true);
    });

    test("old settings select every case of an ensemble with sensitivities", () => {
        const store = makeStoreWithEnsemble();
        deserializeSettings(OLD_SETTINGS, store.set);

        expect(store.get(selectedSensitivityCasesAtom).value).toEqual([
            { sensitivityName: "faults", caseName: "low" },
            { sensitivityName: "faults", caseName: "high" },
        ]);
    });

    test("persisted sensitivity cases are restored", () => {
        const store = makeStoreWithEnsemble();
        deserializeSettings(
            { ...OLD_SETTINGS, sensitivityCases: [{ sensitivityName: "faults", caseName: "high" }] },
            store.set,
        );

        expect(store.get(selectedSensitivityCasesAtom).value).toEqual([
            { sensitivityName: "faults", caseName: "high" },
        ]);
    });

    test("serialized settings include sensitivity cases and pass the schema", () => {
        // No ensemble selected, so no table definition queries are created.
        const serialized = serializeSettings(createStore().get);
        expect(serialized.sensitivityCases).toEqual([]);
        expect(validate(serialized)).toBe(true);
    });
});
