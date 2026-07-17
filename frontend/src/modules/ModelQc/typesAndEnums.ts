// Overall verdict for a single QC check on a single realization.
//
// The backend never computes or returns this - it only exposes raw values/metrics (e.g.
// `is_zero`, `max_rel_change`, `time_gap_ok`). Deriving a pass/fail verdict from those raw values
// is entirely a client-side concern (see view/utils/statusCounts.ts), so this enum is owned here
// rather than generated from the API.
export enum QcCheckStatus {
    PASSED = "passed",
    FAILED = "failed",
    NOT_EVALUATED_PENDING = "not_evaluated_pending",
    NOT_EVALUATED_ERRORED = "not_evaluated_errored",
}

// Human-readable labels for the QC check status verdicts.
export const QcCheckStatusToStringMapping: Record<QcCheckStatus, string> = {
    [QcCheckStatus.PASSED]: "Passed",
    [QcCheckStatus.FAILED]: "Failed",
    [QcCheckStatus.NOT_EVALUATED_PENDING]: "Not evaluated (pending)",
    [QcCheckStatus.NOT_EVALUATED_ERRORED]: "Not evaluated (errored)",
};

// Tailwind background color classes used to render a status badge.
export const QcCheckStatusToColorClassMapping: Record<QcCheckStatus, string> = {
    [QcCheckStatus.PASSED]: "bg-green-500",
    [QcCheckStatus.FAILED]: "bg-red-500",
    [QcCheckStatus.NOT_EVALUATED_PENDING]: "bg-gray-400",
    [QcCheckStatus.NOT_EVALUATED_ERRORED]: "bg-fuchsia-500",
};
