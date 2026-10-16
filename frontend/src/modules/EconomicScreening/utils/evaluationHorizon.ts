import { formatMonthIndex } from "./calendar";
import { monthIndexOf } from "./monthlyProduction";
import { SourceStatus, type EconomicSourceSnapshot } from "./sourceSnapshot";

/** 1 January of the prediction start year through the source envelope end month. */
export type EvaluationHorizon = {
    startYear: number;
    endYear: number;
    endMonthIndex: number;
};

export type EvaluationHorizonState =
    | { status: "NO_START" }
    /** The source has not loaded, so there is no envelope yet. */
    | { status: "LOADING" }
    /** No established envelope: failed or missing sources, or no coverage. */
    | { status: "UNAVAILABLE" }
    | { status: "START_AFTER_END"; startYear: number; envelopeEndMonthIndex: number; envelopeEndYear: number }
    | { status: "READY"; horizon: EvaluationHorizon };

export function resolveEvaluationHorizon(
    predictionStartYear: number | null,
    source: Pick<EconomicSourceSnapshot, "status" | "envelopeEndMonthIndex">,
): EvaluationHorizonState {
    if (predictionStartYear === null) {
        return { status: "NO_START" };
    }
    const endMonthIndex = source.envelopeEndMonthIndex;
    if (endMonthIndex === null) {
        return { status: source.status === SourceStatus.LOADING ? "LOADING" : "UNAVAILABLE" };
    }
    const endYear = Math.floor(endMonthIndex / 12);
    if (monthIndexOf(predictionStartYear, 1) > endMonthIndex) {
        return {
            status: "START_AFTER_END",
            startYear: predictionStartYear,
            envelopeEndMonthIndex: endMonthIndex,
            envelopeEndYear: endYear,
        };
    }
    return { status: "READY", horizon: { startYear: predictionStartYear, endYear, endMonthIndex } };
}

export function isYearInHorizon(year: number, horizon: EvaluationHorizon): boolean {
    return year >= horizon.startYear && year <= horizon.endYear;
}

/** Why there is no evaluation; null when there is one or the source is still loading. */
export function getEvaluationHorizonError(state: EvaluationHorizonState): string | null {
    switch (state.status) {
        case "NO_START":
            return "Enter a prediction start year to calculate results.";
        case "UNAVAILABLE":
            return "Source coverage is unavailable, so the simulation end cannot be established.";
        case "START_AFTER_END":
            return `The prediction start year ${state.startYear} is after the supported simulation end (${formatMonthIndex(state.envelopeEndMonthIndex)}).`;
        case "LOADING":
        case "READY":
            return null;
    }
}
