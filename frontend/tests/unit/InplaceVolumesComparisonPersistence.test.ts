import { Ajv } from "ajv/dist/jtd";
import { describe, expect, test } from "vitest";

import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import {
    SERIALIZED_SETTINGS_SCHEMA,
    type SerializedSettings,
} from "@modules/InplaceVolumesComparison/settings/persistence";

const OLD_SETTINGS: SerializedSettings = {
    referenceEnsembleIdentString: null,
    comparisonEnsembleIdentString: null,
    referenceTableName: "geogrid",
    comparisonTableName: "geogrid",
    resultName: "STOIIP",
    subplotBy: null,
    indicesWithValues: [],
    indexValueCriteria: IndexValueCriteria.REQUIRE_EQUALITY,
    showTable: true,
};

describe("InplaceVolumesComparison settings persistence", () => {
    const validate = new Ajv().compile(SERIALIZED_SETTINGS_SCHEMA);

    test("schema accepts old settings without sensitivity cases", () => {
        expect(validate(OLD_SETTINGS)).toBe(true);
    });

    test("schema accepts null and object sensitivity cases", () => {
        expect(
            validate({
                ...OLD_SETTINGS,
                referenceSensitivityCase: { sensitivityName: "rms_seed", caseName: "p10_p90" },
                comparisonSensitivityCase: null,
            }),
        ).toBe(true);
        expect(validate({ ...OLD_SETTINGS, referenceSensitivityCase: { sensitivityName: "rms_seed" } })).toBe(false);
    });
});
