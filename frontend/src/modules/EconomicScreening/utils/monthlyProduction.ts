/**
 * Monthly production increments derived from cumulative simulation vectors, with coverage taken from
 * the backend's opt-in `sourceCoverage` metadata.
 *
 * The backend resamples cumulative vectors to month starts from the month containing the first raw
 * sample through the month start at or after the last raw sample, interpolating linearly inside the
 * raw range and holding endpoint values outside it. The resampled values alone therefore cannot
 * show which increments are supported; that information comes from `sourceCoverage`. Missing or
 * malformed metadata leaves every interval unverified rather than implicitly supported.
 */
import type { SourceCoverageInterval_api, VectorRealizationData_api, VectorSourceSummary_api } from "@api";
import { SourceCoverageIntervalStatus_api, SourceCoverageInterpolationMethod_api, SourceCoverageRole_api } from "@api";

/** Coverage of a single monthly increment relative to the raw source samples. */
export enum MonthCoverage {
    /** Both boundaries are raw source samples in every required source. Not a field measurement. */
    SOURCE_ALIGNED = "SOURCE_ALIGNED",
    /** Fully inside the source range, but at least one boundary is linearly interpolated. */
    INTERPOLATED = "INTERPOLATED",
    /** Only part of the month lies inside the common source range. */
    PARTIAL = "PARTIAL",
    /** No positive-duration overlap with the common source range; the value is held padding. */
    UNSUPPORTED = "UNSUPPORTED",
    /** Coverage metadata is missing, malformed or inconsistent. */
    UNVERIFIED = "UNVERIFIED",
}

/** Strongest first, so combining coverage keeps the highest index. */
const COVERAGE_STRENGTH_ORDER = [
    MonthCoverage.SOURCE_ALIGNED,
    MonthCoverage.INTERPOLATED,
    MonthCoverage.PARTIAL,
    MonthCoverage.UNSUPPORTED,
    MonthCoverage.UNVERIFIED,
];

export enum SourceKind {
    REGULAR = "REGULAR",
    DELTA = "DELTA",
}

export type MonthlyVolumeSample = {
    year: number;
    /** Calendar month, 1-12. */
    month: number;
    /** Volume produced during the month, in the unit of the source vector. */
    volume: number;
    coverage: MonthCoverage;
};

export enum MonthlySamplingRejection {
    LENGTH_MISMATCH = "LENGTH_MISMATCH",
    TOO_FEW_SAMPLES = "TOO_FEW_SAMPLES",
    NON_FINITE_SAMPLE = "NON_FINITE_SAMPLE",
    NOT_MONTH_START = "NOT_MONTH_START",
    NON_CONSECUTIVE_MONTHS = "NON_CONSECUTIVE_MONTHS",
}

export type MonthlyProductionProfile = {
    months: MonthlyVolumeSample[];
    /** Sum of all increments, which equals the last minus the first cumulative sample. */
    totalIncrement: number;
    /** Null when the samples form a valid monthly series. */
    rejection: MonthlySamplingRejection | null;
};

export type AdaptedSourceCoverage = {
    /** One entry per adjacent pair of timestamps. */
    intervalCoverage: MonthCoverage[];
    /** End of the positive-duration common source support, or null when unverified or absent. */
    supportEndUtcMs: number | null;
    isVerified: boolean;
};

export function monthStartUtcMs(year: number, month: number): number {
    return Date.UTC(year, month - 1, 1);
}

/** True when the timestamp is exactly midnight UTC on the first day of a month. */
export function isMonthStartUtcMs(timestampUtcMs: number): boolean {
    const date = new Date(timestampUtcMs);
    return (
        date.getUTCDate() === 1 &&
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0 &&
        date.getUTCMilliseconds() === 0
    );
}

/** Absolute month number, `year * 12 + (month - 1)`. */
export function monthIndexOf(year: number, month: number): number {
    return year * 12 + (month - 1);
}

function monthIndexOfUtcMs(timestampUtcMs: number): number {
    const date = new Date(timestampUtcMs);
    return monthIndexOf(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

/** Last calendar month with positive-duration support; a month-start end closes the previous month. */
export function lastSupportedMonthIndex(supportEndUtcMs: number): number {
    const monthIndex = monthIndexOfUtcMs(supportEndUtcMs);
    return isMonthStartUtcMs(supportEndUtcMs) ? monthIndex - 1 : monthIndex;
}

export function combineMonthCoverage(...coverages: MonthCoverage[]): MonthCoverage {
    return coverages.reduce(
        (weakest, coverage) =>
            COVERAGE_STRENGTH_ORDER.indexOf(coverage) > COVERAGE_STRENGTH_ORDER.indexOf(weakest) ? coverage : weakest,
        MonthCoverage.SOURCE_ALIGNED,
    );
}

function unverifiedCoverage(timestampCount: number): AdaptedSourceCoverage {
    return {
        intervalCoverage: new Array(Math.max(timestampCount - 1, 0)).fill(MonthCoverage.UNVERIFIED),
        supportEndUtcMs: null,
        isVerified: false,
    };
}

function hasExpectedRoles(sources: VectorSourceSummary_api[], sourceKind: SourceKind): boolean {
    const roles = sources.map((source) => source.role);
    if (sourceKind === SourceKind.REGULAR) {
        return roles.length === 1 && roles[0] === SourceCoverageRole_api.REGULAR;
    }
    return (
        roles.length === 2 &&
        roles.includes(SourceCoverageRole_api.COMPARISON) &&
        roles.includes(SourceCoverageRole_api.REFERENCE)
    );
}

function isValidSourceSummary(source: VectorSourceSummary_api): boolean {
    return (
        Number.isFinite(source.firstTimestampUtcMs) &&
        Number.isFinite(source.lastTimestampUtcMs) &&
        source.firstTimestampUtcMs <= source.lastTimestampUtcMs &&
        Number.isInteger(source.sampleCount) &&
        source.sampleCount >= 1 &&
        (source.sampleCount > 1 || source.firstTimestampUtcMs === source.lastTimestampUtcMs) &&
        (source.maxSampleGapMs === null || (Number.isFinite(source.maxSampleGapMs) && source.maxSampleGapMs >= 0))
    );
}

/** Checks a reported interval against the common source range the backend must have clipped it to. */
function isConsistentInterval(
    interval: SourceCoverageInterval_api,
    intervalStartUtcMs: number,
    intervalEndUtcMs: number,
    commonStartUtcMs: number,
    commonEndUtcMs: number,
): boolean {
    const clippedStart = Math.max(intervalStartUtcMs, commonStartUtcMs);
    const clippedEnd = Math.min(intervalEndUtcMs, commonEndUtcMs);
    const hasOverlap = clippedStart < clippedEnd;
    const isFullySupported = hasOverlap && clippedStart === intervalStartUtcMs && clippedEnd === intervalEndUtcMs;

    switch (interval.status) {
        case SourceCoverageIntervalStatus_api.SOURCE_ALIGNED:
        case SourceCoverageIntervalStatus_api.INTERPOLATED:
            return (
                isFullySupported &&
                interval.supportedStartUtcMs === intervalStartUtcMs &&
                interval.supportedEndUtcMs === intervalEndUtcMs
            );
        case SourceCoverageIntervalStatus_api.PARTIAL:
            return (
                hasOverlap &&
                !isFullySupported &&
                interval.supportedStartUtcMs === clippedStart &&
                interval.supportedEndUtcMs === clippedEnd
            );
        case SourceCoverageIntervalStatus_api.UNSUPPORTED:
            return !hasOverlap && interval.supportedStartUtcMs === null && interval.supportedEndUtcMs === null;
        default:
            return false;
    }
}

const STATUS_TO_MONTH_COVERAGE: Record<SourceCoverageIntervalStatus_api, MonthCoverage> = {
    [SourceCoverageIntervalStatus_api.SOURCE_ALIGNED]: MonthCoverage.SOURCE_ALIGNED,
    [SourceCoverageIntervalStatus_api.INTERPOLATED]: MonthCoverage.INTERPOLATED,
    [SourceCoverageIntervalStatus_api.PARTIAL]: MonthCoverage.PARTIAL,
    [SourceCoverageIntervalStatus_api.UNSUPPORTED]: MonthCoverage.UNSUPPORTED,
};

/**
 * Converts the backend's `sourceCoverage` into per-interval module coverage. Missing, malformed or
 * internally inconsistent metadata leaves the whole series unverified.
 */
export function adaptSourceCoverage(
    data: Pick<VectorRealizationData_api, "timestampsUtcMs" | "sourceCoverage">,
    sourceKind: SourceKind,
): AdaptedSourceCoverage {
    const timestamps = data.timestampsUtcMs;
    const coverage = data.sourceCoverage;
    if (
        !coverage ||
        coverage.interpolationMethod !== SourceCoverageInterpolationMethod_api.LINEAR ||
        !Array.isArray(coverage.sources) ||
        !Array.isArray(coverage.intervals) ||
        !hasExpectedRoles(coverage.sources, sourceKind) ||
        !coverage.sources.every(isValidSourceSummary) ||
        coverage.intervals.length !== Math.max(timestamps.length - 1, 0)
    ) {
        return unverifiedCoverage(timestamps.length);
    }
    for (let index = 0; index < timestamps.length; index++) {
        if (!Number.isFinite(timestamps[index]) || (index > 0 && timestamps[index] <= timestamps[index - 1])) {
            return unverifiedCoverage(timestamps.length);
        }
    }

    const commonStartUtcMs = Math.max(...coverage.sources.map((source) => source.firstTimestampUtcMs));
    const commonEndUtcMs = Math.min(...coverage.sources.map((source) => source.lastTimestampUtcMs));
    const intervalCoverage: MonthCoverage[] = [];
    for (let index = 0; index < coverage.intervals.length; index++) {
        const interval = coverage.intervals[index];
        if (
            !isConsistentInterval(interval, timestamps[index], timestamps[index + 1], commonStartUtcMs, commonEndUtcMs)
        ) {
            return unverifiedCoverage(timestamps.length);
        }
        intervalCoverage.push(STATUS_TO_MONTH_COVERAGE[interval.status]);
    }

    return {
        intervalCoverage,
        supportEndUtcMs: commonStartUtcMs < commonEndUtcMs ? commonEndUtcMs : null,
        isVerified: true,
    };
}

/**
 * Converts a monthly-resampled cumulative vector into produced volume per calendar month.
 *
 * `intervalCoverage` comes from `adaptSourceCoverage`. Without it, or with a length that does not match
 * the increments, the increments are still conserved but their coverage is unverified.
 */
export function computeMonthlyVolumesFromCumulative(
    timestampsUtcMs: number[],
    cumulativeValues: number[],
    intervalCoverage?: MonthCoverage[] | null,
): MonthlyProductionProfile {
    const empty = (rejection: MonthlySamplingRejection): MonthlyProductionProfile => ({
        months: [],
        totalIncrement: 0,
        rejection,
    });

    if (timestampsUtcMs.length !== cumulativeValues.length) {
        return empty(MonthlySamplingRejection.LENGTH_MISMATCH);
    }
    if (timestampsUtcMs.length < 2) {
        return empty(MonthlySamplingRejection.TOO_FEW_SAMPLES);
    }
    for (let index = 0; index < timestampsUtcMs.length; index++) {
        if (!Number.isFinite(timestampsUtcMs[index]) || !Number.isFinite(cumulativeValues[index])) {
            return empty(MonthlySamplingRejection.NON_FINITE_SAMPLE);
        }
        if (!isMonthStartUtcMs(timestampsUtcMs[index])) {
            return empty(MonthlySamplingRejection.NOT_MONTH_START);
        }
        if (
            index > 0 &&
            monthIndexOfUtcMs(timestampsUtcMs[index]) !== monthIndexOfUtcMs(timestampsUtcMs[index - 1]) + 1
        ) {
            return empty(MonthlySamplingRejection.NON_CONSECUTIVE_MONTHS);
        }
    }

    const hasCoverage = intervalCoverage?.length === timestampsUtcMs.length - 1;
    const months: MonthlyVolumeSample[] = [];
    for (let index = 0; index < timestampsUtcMs.length - 1; index++) {
        const startDate = new Date(timestampsUtcMs[index]);
        months.push({
            year: startDate.getUTCFullYear(),
            month: startDate.getUTCMonth() + 1,
            volume: cumulativeValues[index + 1] - cumulativeValues[index],
            coverage: hasCoverage ? intervalCoverage![index] : MonthCoverage.UNVERIFIED,
        });
    }

    return {
        months,
        totalIncrement: cumulativeValues[cumulativeValues.length - 1] - cumulativeValues[0],
        rejection: null,
    };
}

/** Coverage states that make a month's volume unusable as a complete observation of that month. */
const UNESTABLISHED_COVERAGE = new Set<MonthCoverage>([
    MonthCoverage.PARTIAL,
    MonthCoverage.UNSUPPORTED,
    MonthCoverage.UNVERIFIED,
]);

export function isMonthCoverageEstablished(coverage: MonthCoverage): boolean {
    return !UNESTABLISHED_COVERAGE.has(coverage);
}

/** Aggregates monthly volumes into calendar-year totals, keeping the weakest coverage per year. */
export function aggregateMonthlyVolumesByYear(
    months: MonthlyVolumeSample[],
): { year: number; volume: number; isCoverageEstablished: boolean; monthCount: number }[] {
    const byYear = new Map<number, { volume: number; isCoverageEstablished: boolean; monthCount: number }>();
    for (const monthSample of months) {
        const entry = byYear.get(monthSample.year) ?? { volume: 0, isCoverageEstablished: true, monthCount: 0 };
        entry.volume += monthSample.volume;
        entry.monthCount += 1;
        entry.isCoverageEstablished = entry.isCoverageEstablished && isMonthCoverageEstablished(monthSample.coverage);
        byYear.set(monthSample.year, entry);
    }
    return Array.from(byYear, ([year, entry]) => ({ year, ...entry })).sort(
        (first, second) => first.year - second.year,
    );
}
