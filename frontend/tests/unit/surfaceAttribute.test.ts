import { describe, expect, test } from "vitest";

import { SurfaceStandardResult_api } from "@api";
import {
    dedupeSurfaceAttributes,
    getSurfaceAttributeDisplayLabel,
    isSameAttribute,
    makeStdResAttribute,
    makeTagNameAttribute,
    surfaceAttributeKey,
} from "@modules/_shared/Surface";

describe("isSameAttribute", () => {
    test("two distinct tagname instances with the same tag name are equal", () => {
        expect(isSameAttribute(makeTagNameAttribute("ds_extract_geogrid"), makeTagNameAttribute("ds_extract_geogrid"))).toBe(
            true,
        );
    });

    test("different tag names are not equal", () => {
        expect(isSameAttribute(makeTagNameAttribute("a"), makeTagNameAttribute("b"))).toBe(false);
    });

    test("tagname and standard-result attributes are never equal", () => {
        expect(
            isSameAttribute(
                makeTagNameAttribute("structure_depth_surface"),
                makeStdResAttribute(SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE),
            ),
        ).toBe(false);
    });

    test("standard-result attributes with the same sub name are equal, distinct instances", () => {
        expect(
            isSameAttribute(
                makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "goc"),
                makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "goc"),
            ),
        ).toBe(true);
    });

    test("standard-result attributes with different sub names are not equal", () => {
        expect(
            isSameAttribute(
                makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "goc"),
                makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "owc"),
            ),
        ).toBe(false);
    });

    test("omitted sub name and null sub name are treated as identical", () => {
        expect(
            isSameAttribute(
                { kind: "STDRES", std_res_name: SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE },
                makeStdResAttribute(SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE, null),
            ),
        ).toBe(true);
    });

    test("null is only equal to null", () => {
        expect(isSameAttribute(null, null)).toBe(true);
        expect(isSameAttribute(null, makeTagNameAttribute("a"))).toBe(false);
        expect(isSameAttribute(makeTagNameAttribute("a"), null)).toBe(false);
    });
});

describe("surfaceAttributeKey", () => {
    test("normalizes an omitted sub name to the same key as an explicit null", () => {
        const withSubName = surfaceAttributeKey({
            kind: "STDRES",
            std_res_name: SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE,
        });
        const withNullSubName = surfaceAttributeKey(
            makeStdResAttribute(SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE, null),
        );

        expect(withSubName).toBe(withNullSubName);
    });

    test("keys differ across kinds even with overlapping identifier text", () => {
        const tagNameKey = surfaceAttributeKey(makeTagNameAttribute("structure_depth_surface"));
        const stdResKey = surfaceAttributeKey(makeStdResAttribute(SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE));

        expect(tagNameKey).not.toBe(stdResKey);
    });
});

describe("dedupeSurfaceAttributes", () => {
    test("removes duplicate standard-result entries with the same sub name identity", () => {
        const result = dedupeSurfaceAttributes([
            makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "goc"),
            makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "goc"),
            makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "owc"),
            makeTagNameAttribute("ds_extract_geogrid"),
        ]);

        expect(result).toEqual([
            makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "goc"),
            makeStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "owc"),
            makeTagNameAttribute("ds_extract_geogrid"),
        ]);
    });
});

describe("getSurfaceAttributeDisplayLabel", () => {
    test("tagname label is the tag name itself", () => {
        expect(getSurfaceAttributeDisplayLabel(makeTagNameAttribute("ds_extract_geogrid"))).toBe("ds_extract_geogrid");
    });

    test("standard-result label marks provenance, never used as an identifier", () => {
        expect(
            getSurfaceAttributeDisplayLabel(makeStdResAttribute(SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE)),
        ).toBe("structure_depth_surface (standard result)");
    });
});
