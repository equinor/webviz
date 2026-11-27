import { describe, expect, test } from "vitest";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    narrowToRegularEnsembleIdent,
    requireRegularEnsembleIdent,
} from "@modules/_shared/DataProviderFramework/dataProviders/dependencyFunctions/sharedSettingUpdaterFunctions";
import { EnsembleSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/EnsembleSetting";

const regularA = new RegularEnsembleIdent("11111111-1111-4111-8111-111111111111", "iter-0");
const regularB = new RegularEnsembleIdent("22222222-2222-4222-8222-222222222222", "iter-1");
const delta = new DeltaEnsembleIdent(regularA, regularB);

describe("EnsembleSetting", () => {
    const setting = new EnsembleSetting();

    test("round-trips a regular ensemble ident through serialization", () => {
        const restored = setting.deserializeValue(setting.serializeValue(regularA));

        expect(restored).toBeInstanceOf(RegularEnsembleIdent);
        expect(restored?.equals(regularA)).toBe(true);
    });

    test("round-trips a delta ensemble ident through serialization", () => {
        const restored = setting.deserializeValue(setting.serializeValue(delta));

        expect(restored).toBeInstanceOf(DeltaEnsembleIdent);
        expect(restored?.equals(delta)).toBe(true);
    });

    test("deserializes an empty string to null", () => {
        expect(setting.deserializeValue("")).toBeNull();
        expect(setting.serializeValue(null)).toBe("");
    });

    test("throws when deserializing a malformed non-empty string", () => {
        expect(() => setting.deserializeValue("not-an-ident")).toThrow("Invalid ensemble ident");
        expect(() => setting.deserializeValue("null")).toThrow("Invalid ensemble ident");
    });

    test("a delta value is only valid when the constraints hold an equal delta ident", () => {
        const equalDelta = new DeltaEnsembleIdent(
            new RegularEnsembleIdent(regularA.getCaseUuid(), regularA.getEnsembleName()),
            new RegularEnsembleIdent(regularB.getCaseUuid(), regularB.getEnsembleName()),
        );
        const reversedDelta = new DeltaEnsembleIdent(regularB, regularA);

        expect(setting.isValueValid(delta, [regularA, regularB])).toBe(false);
        expect(setting.isValueValid(delta, [regularA, regularB, reversedDelta])).toBe(false);
        expect(setting.isValueValid(delta, [regularA, regularB, equalDelta])).toBe(true);
        expect(setting.isValueValid(regularA, [regularA, delta])).toBe(true);
        expect(setting.isValueValid(null, [regularA, delta])).toBe(false);
    });

    test("fixupValue keeps a valid value (compared with .equals) and otherwise falls back to the first constraint", () => {
        const equalDelta = new DeltaEnsembleIdent(
            new RegularEnsembleIdent(regularA.getCaseUuid(), regularA.getEnsembleName()),
            new RegularEnsembleIdent(regularB.getCaseUuid(), regularB.getEnsembleName()),
        );
        const equalRegularA = new RegularEnsembleIdent(regularA.getCaseUuid(), regularA.getEnsembleName());

        expect(setting.fixupValue(equalDelta, [regularA, delta])).toBe(equalDelta);
        expect(setting.fixupValue(equalRegularA, [regularB, regularA])).toBe(equalRegularA);
        expect(setting.fixupValue(delta, [regularA, regularB])).toBe(regularA);
        expect(setting.fixupValue(null, [delta, regularA])).toBe(delta);
        expect(setting.fixupValue(delta, [])).toBeNull();
    });
});

describe("narrowToRegularEnsembleIdent and requireRegularEnsembleIdent", () => {
    test("narrowToRegularEnsembleIdent passes null and regular idents through and maps delta idents to null", () => {
        expect(narrowToRegularEnsembleIdent(null)).toBeNull();
        expect(narrowToRegularEnsembleIdent(regularA)).toBe(regularA);
        expect(narrowToRegularEnsembleIdent(delta)).toBeNull();
    });

    test("requireRegularEnsembleIdent passes null and regular idents through and throws for delta idents", () => {
        expect(requireRegularEnsembleIdent(null)).toBeNull();
        expect(requireRegularEnsembleIdent(regularA)).toBe(regularA);
        expect(() => requireRegularEnsembleIdent(delta)).toThrow("Delta ensembles are not supported");
    });
});
