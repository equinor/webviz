import { describe, expect, test } from "vitest";

import {
    getEvaluationHorizonError,
    isYearInHorizon,
    resolveEvaluationHorizon,
} from "@modules/EconomicScreening/utils/evaluationHorizon";
import { monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";
import { SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";

const READY_THROUGH_JUNE_2031 = { status: SourceStatus.READY, envelopeEndMonthIndex: monthIndexOf(2031, 6) };

describe("resolveEvaluationHorizon", () => {
    test("a missing start year wins over every source state", () => {
        for (const status of Object.values(SourceStatus)) {
            expect(resolveEvaluationHorizon(null, { status, envelopeEndMonthIndex: null })).toEqual({
                status: "NO_START",
            });
        }
        expect(resolveEvaluationHorizon(null, READY_THROUGH_JUNE_2031)).toEqual({ status: "NO_START" });
    });

    test("without an envelope, a loading source is LOADING and any other source is UNAVAILABLE", () => {
        expect(resolveEvaluationHorizon(2030, { status: SourceStatus.LOADING, envelopeEndMonthIndex: null })).toEqual({
            status: "LOADING",
        });
        for (const status of [
            SourceStatus.NO_ENSEMBLE,
            SourceStatus.ERROR,
            SourceStatus.NO_SOURCES,
            SourceStatus.READY,
        ]) {
            expect(resolveEvaluationHorizon(2030, { status, envelopeEndMonthIndex: null })).toEqual({
                status: "UNAVAILABLE",
            });
        }
    });

    test("an envelope ending in a partial year evaluates through its end month", () => {
        expect(resolveEvaluationHorizon(2030, READY_THROUGH_JUNE_2031)).toEqual({
            status: "READY",
            horizon: { startYear: 2030, endYear: 2031, endMonthIndex: monthIndexOf(2031, 6) },
        });
    });

    test("January of the start year must be inside the envelope", () => {
        const endsJanuary2031 = { status: SourceStatus.READY, envelopeEndMonthIndex: monthIndexOf(2031, 1) };
        expect(resolveEvaluationHorizon(2031, endsJanuary2031)).toEqual({
            status: "READY",
            horizon: { startYear: 2031, endYear: 2031, endMonthIndex: monthIndexOf(2031, 1) },
        });

        const endsDecember2030 = { status: SourceStatus.READY, envelopeEndMonthIndex: monthIndexOf(2030, 12) };
        expect(resolveEvaluationHorizon(2031, endsDecember2030)).toEqual({
            status: "START_AFTER_END",
            startYear: 2031,
            envelopeEndMonthIndex: monthIndexOf(2030, 12),
            envelopeEndYear: 2030,
        });
    });
});

describe("getEvaluationHorizonError", () => {
    test("names why there is no evaluation, and nothing while loading or ready", () => {
        expect(getEvaluationHorizonError({ status: "NO_START" })).toBe(
            "Enter an evaluation start year to calculate results.",
        );
        expect(getEvaluationHorizonError({ status: "UNAVAILABLE" })).toBe(
            "Source coverage is unavailable, so the simulation end cannot be established.",
        );
        expect(getEvaluationHorizonError(resolveEvaluationHorizon(2032, READY_THROUGH_JUNE_2031))).toBe(
            "The evaluation start year 2032 is after the supported simulation end (Jun 2031).",
        );
        expect(getEvaluationHorizonError({ status: "LOADING" })).toBeNull();
        expect(getEvaluationHorizonError(resolveEvaluationHorizon(2030, READY_THROUGH_JUNE_2031))).toBeNull();
    });
});

describe("isYearInHorizon", () => {
    test("includes both the start year and the partial final year", () => {
        const horizon = { startYear: 2030, endYear: 2031, endMonthIndex: monthIndexOf(2031, 6) };
        expect([2029, 2030, 2031, 2032].map((year) => isYearInHorizon(year, horizon))).toEqual([
            false,
            true,
            true,
            false,
        ]);
    });
});
