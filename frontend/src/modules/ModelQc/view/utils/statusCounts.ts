import type { Tone } from "@lib/components/_shared/types/tones";

import { QcCheckStatus } from "../../typesAndEnums";

export type StatusCounts = {
    passed: number;
    failed: number;
    notEvaluated: number;
    total: number;
};

// Aggregate the per-realization verdicts into high-level counts used by the summary header.
export function computeStatusCounts(realizationResults: ReadonlyArray<{ status: QcCheckStatus }>): StatusCounts {
    const counts: StatusCounts = { passed: 0, failed: 0, notEvaluated: 0, total: realizationResults.length };

    for (const realizationResult of realizationResults) {
        if (realizationResult.status === QcCheckStatus.PASSED) {
            counts.passed++;
        } else if (realizationResult.status === QcCheckStatus.FAILED) {
            counts.failed++;
        } else {
            counts.notEvaluated++;
        }
    }

    return counts;
}

// A grid property stays "within threshold" when its largest relative change does not exceed the
// (client-owned) threshold. The backend only returns the raw change metric, so this verdict is
// derived here - which means changing the threshold never triggers a (expensive) recompute.
export function isGridPropertyWithinThreshold(propertyValue: { max_rel_change: number }, threshold: number): boolean {
    return propertyValue.max_rel_change <= threshold;
}

// Apply the threshold to a single realization's grid properties to derive its pass/fail verdict.
export function computeGridRealizationStatus(
    realizationResult: { property_values: ReadonlyArray<{ max_rel_change: number }> },
    threshold: number,
): QcCheckStatus {
    if (realizationResult.property_values.length === 0) {
        return QcCheckStatus.NOT_EVALUATED;
    }
    const allWithin = realizationResult.property_values.every((propertyValue) =>
        isGridPropertyWithinThreshold(propertyValue, threshold),
    );
    return allWithin ? QcCheckStatus.PASSED : QcCheckStatus.FAILED;
}

// A realization passes the vector check when the time gap is ok and every vector is zero. The
// backend only returns the raw `is_zero`/`value_at_t1` values (and `time_gap_ok`), so the verdict
// is derived here rather than in the service layer.
export function computeVectorRealizationStatus(
    realizationResult: { vector_values: ReadonlyArray<{ is_zero: boolean; value_at_t1?: number | null }> },
    timeGapOk: boolean,
): QcCheckStatus {
    if (realizationResult.vector_values.some((v) => v.value_at_t1 === null || v.value_at_t1 === undefined)) {
        return QcCheckStatus.NOT_EVALUATED;
    }
    if (timeGapOk && realizationResult.vector_values.every((v) => v.is_zero)) {
        return QcCheckStatus.PASSED;
    }
    return QcCheckStatus.FAILED;
}

// Combine several count objects into one, used to roll a parent section up from its child sections.
export function mergeCounts(...countsList: StatusCounts[]): StatusCounts {
    const merged: StatusCounts = { passed: 0, failed: 0, notEvaluated: 0, total: 0 };
    for (const counts of countsList) {
        merged.passed += counts.passed;
        merged.failed += counts.failed;
        merged.notEvaluated += counts.notEvaluated;
        merged.total += counts.total;
    }
    return merged;
}

// Roll a section's verdict up into a single "traffic light" tone for its collapsible header:
// any failure makes the whole section red; otherwise it stays neutral until every realization has
// resolved (no notEvaluated slots left) since e.g. the grid check fills in progressively as its
// per-realization requests complete, and should not flash green just because the first one passed.
export function toneFromCounts(counts: StatusCounts): Tone {
    if (counts.failed > 0) {
        return "danger";
    }
    if (counts.notEvaluated > 0) {
        return "warning";
    }
    if (counts.passed > 0) {
        return "success";
    }
    return "neutral";
}

// Roll a single check section up into a header "traffic light" tone. While the check is loading (or
// has no result yet) the header stays neutral; a failed request turns it red.
export function computeSectionTone(
    query: { isError: boolean; isFetching: boolean },
    counts: StatusCounts | null,
): Tone {
    if (query.isError) {
        return "danger";
    }
    if (query.isFetching || !counts) {
        return "neutral";
    }
    return toneFromCounts(counts);
}
