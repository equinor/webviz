import { describe, expect, test } from "vitest";

import { SurfaceStandardResult_api } from "@api";
import { SurfaceAttributeSetting } from "@modules/_shared/DataProviderFramework/settings/implementations/SurfaceAttributeSetting";

function setting(): SurfaceAttributeSetting {
    return new SurfaceAttributeSetting();
}

describe("SurfaceAttributeSetting.serializeValue / deserializeValue", () => {
    test("null round-trips to null", () => {
        const s = setting();
        expect(s.deserializeValue(s.serializeValue(null))).toBeNull();
    });

    test("tagname attribute round-trips", () => {
        const s = setting();
        const value = { kind: "TAGNAME" as const, tag_name: "ds_extract_geogrid" };
        expect(s.deserializeValue(s.serializeValue(value))).toEqual(value);
    });

    test("standard-result attribute with sub name round-trips", () => {
        const s = setting();
        const value = {
            kind: "STDRES" as const,
            std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE,
            sub_name: "goc",
        };
        expect(s.deserializeValue(s.serializeValue(value))).toEqual(value);
    });

    test("standard-result attribute with omitted sub name deserializes to null sub_name", () => {
        const s = setting();
        const serialized = JSON.stringify({
            kind: "STDRES",
            std_res_name: SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE,
        });

        expect(s.deserializeValue(serialized)).toEqual({
            kind: "STDRES",
            std_res_name: SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE,
            sub_name: null,
        });
    });

    test("legacy plain tagname string is upgraded to a TAGNAME attribute", () => {
        const s = setting();
        expect(s.deserializeValue(JSON.stringify("ds_extract_geogrid"))).toEqual({
            kind: "TAGNAME",
            tag_name: "ds_extract_geogrid",
        });
    });

    test("legacy suffixed standard-result string is upgraded to a STDRES attribute", () => {
        const s = setting();
        expect(s.deserializeValue(JSON.stringify("structure_depth_surface (standard result)"))).toEqual({
            kind: "STDRES",
            std_res_name: SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE,
            sub_name: null,
        });
    });

    test("legacy suffixed string with an unrecognized standard result is preserved as a literal tagname", () => {
        const s = setting();
        expect(s.deserializeValue(JSON.stringify("inplace_volumes (standard result)"))).toEqual({
            kind: "TAGNAME",
            tag_name: "inplace_volumes (standard result)",
        });
    });

    test("malformed JSON throws", () => {
        const s = setting();
        expect(() => s.deserializeValue("{not json")).toThrow();
    });

    test("an array value throws", () => {
        const s = setting();
        expect(() => s.deserializeValue(JSON.stringify([1, 2, 3]))).toThrow();
    });

    test("an object missing a recognized kind throws", () => {
        const s = setting();
        expect(() => s.deserializeValue(JSON.stringify({ tag_name: "depth" }))).toThrow();
    });

    test("a STDRES object with an unrecognized std_res_name throws", () => {
        const s = setting();
        expect(() => s.deserializeValue(JSON.stringify({ kind: "STDRES", std_res_name: "not_a_std_res" }))).toThrow();
    });
});

describe("SurfaceAttributeSetting.isValueValid / fixupValue", () => {
    test("isValueValid matches structurally, not by reference", () => {
        const s = setting();
        const constraints = [
            { kind: "STDRES" as const, std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "goc" },
        ];
        const distinctInstance = {
            kind: "STDRES" as const,
            std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE,
            sub_name: "goc",
        };

        expect(s.isValueValid(distinctInstance, constraints)).toBe(true);
    });

    test("isValueValid distinguishes sub names", () => {
        const s = setting();
        const constraints = [
            { kind: "STDRES" as const, std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "goc" },
        ];
        const otherSubName = {
            kind: "STDRES" as const,
            std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE,
            sub_name: "owc",
        };

        expect(s.isValueValid(otherSubName, constraints)).toBe(false);
    });

    test("fixupValue preserves a valid selection given as a distinct instance", () => {
        const s = setting();
        const constraints = [
            { kind: "TAGNAME" as const, tag_name: "a" },
            { kind: "TAGNAME" as const, tag_name: "b" },
        ];

        expect(s.fixupValue({ kind: "TAGNAME", tag_name: "b" }, constraints)).toEqual({
            kind: "TAGNAME",
            tag_name: "b",
        });
    });

    test("fixupValue falls back to the first constraint when the selection is no longer available", () => {
        const s = setting();
        const constraints = [
            { kind: "TAGNAME" as const, tag_name: "a" },
            { kind: "TAGNAME" as const, tag_name: "b" },
        ];

        expect(s.fixupValue({ kind: "TAGNAME", tag_name: "gone" }, constraints)).toEqual({
            kind: "TAGNAME",
            tag_name: "a",
        });
    });

    test("fixupValue returns null when there are no constraints", () => {
        const s = setting();
        expect(s.fixupValue({ kind: "TAGNAME", tag_name: "a" }, [])).toBeNull();
    });
});

describe("SurfaceAttributeSetting.valueConstraintsIntersectionReducerDefinition", () => {
    test("intersects by structural identity across distinct object instances", () => {
        const s = setting();
        const { reducer, startingValue } = s.valueConstraintsIntersectionReducerDefinition;

        const first = [
            { kind: "TAGNAME" as const, tag_name: "a" },
            { kind: "STDRES" as const, std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "goc" },
        ];
        const second = [
            { kind: "STDRES" as const, std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "goc" },
            { kind: "TAGNAME" as const, tag_name: "b" },
        ];

        let acc = reducer(startingValue, first, 0);
        acc = reducer(acc, second, 1);

        expect(acc).toEqual([
            { kind: "STDRES", std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "goc" },
        ]);
    });

    test("distinguishes sub names within the same standard result during intersection", () => {
        const s = setting();
        const { reducer, startingValue } = s.valueConstraintsIntersectionReducerDefinition;

        const first = [
            { kind: "STDRES" as const, std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "goc" },
        ];
        const second = [
            { kind: "STDRES" as const, std_res_name: SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, sub_name: "owc" },
        ];

        let acc = reducer(startingValue, first, 0);
        acc = reducer(acc, second, 1);

        expect(acc).toEqual([]);
    });
});
