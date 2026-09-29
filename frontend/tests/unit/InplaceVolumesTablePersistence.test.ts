import { Ajv } from "ajv/dist/jtd";
import { createStore } from "jotai";
import { describe, expect, test } from "vitest";

import { InplaceVolumesStatistic_api } from "@api";
import { SensitivityType } from "@framework/EnsembleSensitivities";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";
import { selectedStatisticsLayoutAtom } from "@modules/InplaceVolumesTable/settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedSensitivityCasesAtom,
} from "@modules/InplaceVolumesTable/settings/atoms/persistableFixableAtoms";
import {
    deserializeSettings,
    SERIALIZED_SETTINGS_SCHEMA,
    serializeSettings,
    type SerializedSettings,
} from "@modules/InplaceVolumesTable/settings/persistence";
import { StatisticsLayout } from "@modules/InplaceVolumesTable/types";

const OLD_SETTINGS: Omit<SerializedSettings, "selectedStatisticsLayout"> = {
    selectedEnsembleIdentStrings: [],
    selectedTableNames: ["geogrid"],
    selectedIndicesWithValues: [],
    selectedResultNames: ["STOIIP"],
    selectedGroupByIndices: ["ZONE"],
    selectedTableType: TableType.STATISTICAL,
    selectedStatisticOptions: [InplaceVolumesStatistic_api.MEAN],
    selectedIndexValueCriteria: IndexValueCriteria.REQUIRE_EQUALITY,
};

const SENSITIVITY_ENSEMBLE = new RegularEnsemble(
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

describe("InplaceVolumesTable settings persistence", () => {
    const validate = new Ajv().compile(SERIALIZED_SETTINGS_SCHEMA);

    test("schema accepts old settings without a statistics layout", () => {
        expect(validate(OLD_SETTINGS)).toBe(true);
    });

    test("schema accepts known layouts and rejects unknown ones", () => {
        expect(validate({ ...OLD_SETTINGS, selectedStatisticsLayout: StatisticsLayout.RESPONSES_AS_ROWS })).toBe(true);
        expect(validate({ ...OLD_SETTINGS, selectedStatisticsLayout: "SIDEWAYS" })).toBe(false);
    });

    test("deserializing old settings keeps the default layout", () => {
        const store = createStore();
        deserializeSettings(OLD_SETTINGS, store.set);

        expect(store.get(selectedStatisticsLayoutAtom)).toBe(StatisticsLayout.RESPONSES_AS_COLUMNS);
    });

    test("the layout survives a round trip", () => {
        const store = createStore();
        store.set(selectedStatisticsLayoutAtom, StatisticsLayout.RESPONSES_AS_ROWS);

        const serialized = serializeSettings(store.get);
        expect(serialized.selectedStatisticsLayout).toBe(StatisticsLayout.RESPONSES_AS_ROWS);
        expect(validate(serialized)).toBe(true);

        const restoredStore = createStore();
        deserializeSettings(serialized, restoredStore.set);
        expect(restoredStore.get(selectedStatisticsLayoutAtom)).toBe(StatisticsLayout.RESPONSES_AS_ROWS);
    });

    test("schema accepts settings with and without sensitivity cases", () => {
        expect(validate({ ...OLD_SETTINGS })).toBe(true);
        expect(
            validate({ ...OLD_SETTINGS, selectedSensitivityCases: [{ sensitivityName: "faults", caseName: "high" }] }),
        ).toBe(true);
        expect(validate({ ...OLD_SETTINGS, selectedSensitivityCases: [{ sensitivityName: "faults" }] })).toBe(false);
    });

    test("persisted sensitivity cases are restored", () => {
        const store = createStore();
        deserializeSettings(
            { ...OLD_SETTINGS, selectedSensitivityCases: [{ sensitivityName: "faults", caseName: "high" }] },
            store.set,
        );
        store.set(EnsembleSetAtom, new EnsembleSet([SENSITIVITY_ENSEMBLE]));
        store.set(selectedEnsembleIdentsAtom, [SENSITIVITY_ENSEMBLE.getIdent()]);

        expect(store.get(selectedSensitivityCasesAtom).value).toEqual([
            { sensitivityName: "faults", caseName: "high" },
        ]);
    });

    test("old settings select every case of an ensemble with sensitivities", () => {
        const store = createStore();
        deserializeSettings(OLD_SETTINGS, store.set);
        store.set(EnsembleSetAtom, new EnsembleSet([SENSITIVITY_ENSEMBLE]));
        store.set(selectedEnsembleIdentsAtom, [SENSITIVITY_ENSEMBLE.getIdent()]);

        expect(store.get(selectedSensitivityCasesAtom).value).toEqual([
            { sensitivityName: "faults", caseName: "low" },
            { sensitivityName: "faults", caseName: "high" },
        ]);
    });
});
