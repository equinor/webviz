import { Ajv } from "ajv/dist/jtd";
import { createStore } from "jotai";
import { describe, expect, test } from "vitest";

import { InplaceVolumesStatistic_api } from "@api";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";
import { selectedStatisticsLayoutAtom } from "@modules/InplaceVolumesTable/settings/atoms/baseAtoms";
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
});
