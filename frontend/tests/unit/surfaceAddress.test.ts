import { describe, expect, test } from "vitest";

import { SurfaceStandardResult_api, SurfaceStatisticFunction_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";

const CASE_UUID = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
const ENSEMBLE_IDENT = new RegularEnsembleIdent(CASE_UUID, "iter-0");

function baseBuilder(): SurfaceAddressBuilder {
    return new SurfaceAddressBuilder().withEnsembleIdent(ENSEMBLE_IDENT).withName("VOLANTIS GP. Top");
}

describe("SurfaceAddressBuilder address strings", () => {
    test("realization address with tagname attribute", () => {
        const addrStr = baseBuilder()
            .withTagNameAttribute("ds_extract_geogrid")
            .withRealization(3)
            .buildRealizationAddrStr();

        expect(addrStr).toBe(`REAL~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~TAGNAME~~ds_extract_geogrid~~-~~3`);
    });

    test("realization address with standard result attribute and sub name", () => {
        const addrStr = baseBuilder()
            .withStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "owc")
            .withRealization(3)
            .buildRealizationAddrStr();

        expect(addrStr).toBe(`REAL~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~STDRES~~fluid_contact_surface~~owc~~3`);
    });

    test("standard result attribute without sub name uses placeholder", () => {
        const addrStr = baseBuilder()
            .withStdResAttribute(SurfaceStandardResult_api.STRUCTURE_DEPTH_SURFACE)
            .withRealization(3)
            .buildRealizationAddrStr();

        expect(addrStr).toBe(`REAL~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~STDRES~~structure_depth_surface~~-~~3`);
    });

    test("realization address appends time when set", () => {
        const addrStr = baseBuilder()
            .withTagNameAttribute("amplitude")
            .withRealization(3)
            .withTimeOrInterval("2024-01-31T00:00:00Z")
            .buildRealizationAddrStr();

        expect(addrStr).toBe(
            `REAL~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~TAGNAME~~amplitude~~-~~3~~2024-01-31T00:00:00Z`,
        );
    });

    test("statistical address uses wildcard when no realizations set", () => {
        const addrStr = baseBuilder()
            .withStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "fwl")
            .withStatisticFunction(SurfaceStatisticFunction_api.MEAN)
            .buildStatisticalAddrStr();

        expect(addrStr).toBe(
            `STAT~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~STDRES~~fluid_contact_surface~~fwl~~MEAN~~*`,
        );
    });

    test("statistical address encodes explicit realizations", () => {
        const addrStr = baseBuilder()
            .withTagNameAttribute("ds_extract_geogrid")
            .withStatisticFunction(SurfaceStatisticFunction_api.P10)
            .withStatisticRealizations([1, 2, 3, 5])
            .buildStatisticalAddrStr();

        expect(addrStr).toBe(
            `STAT~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~TAGNAME~~ds_extract_geogrid~~-~~P10~~1-3!5`,
        );
    });

    test("observed address omits ensemble", () => {
        const addrStr = new SurfaceAddressBuilder()
            .withEnsembleIdent(ENSEMBLE_IDENT)
            .withName("VOLANTIS GP. Top")
            .withTagNameAttribute("amplitude")
            .withTimeOrInterval("2024-01-31T00:00:00Z")
            .buildObservedAddrStr();

        expect(addrStr).toBe(`OBS~~${CASE_UUID}~~VOLANTIS GP. Top~~TAGNAME~~amplitude~~-~~2024-01-31T00:00:00Z`);
    });

    test("throws when realization is missing", () => {
        expect(() => baseBuilder().withTagNameAttribute("amplitude").buildRealizationAddrStr()).toThrow(
            "Realization number not set",
        );
    });

    test("throws when attribute is missing", () => {
        expect(() => baseBuilder().withRealization(3).buildRealizationAddrStr()).toThrow("Surface attribute not set");
    });

    test("throws when sub name is the reserved placeholder", () => {
        expect(() =>
            baseBuilder()
                .withStdResAttribute(SurfaceStandardResult_api.FLUID_CONTACT_SURFACE, "-")
                .withRealization(3)
                .buildRealizationAddrStr(),
        ).toThrow("reserved placeholder");
    });

    test("tag name may be the reserved placeholder", () => {
        const addrStr = baseBuilder().withTagNameAttribute("-").withRealization(3).buildRealizationAddrStr();

        expect(addrStr).toBe(`REAL~~${CASE_UUID}~~iter-0~~VOLANTIS GP. Top~~TAGNAME~~-~~-~~3`);
    });

    test("throws when statistic function is missing", () => {
        expect(() => baseBuilder().withTagNameAttribute("amplitude").buildStatisticalAddrStr()).toThrow(
            "Statistic function not set",
        );
    });
});
