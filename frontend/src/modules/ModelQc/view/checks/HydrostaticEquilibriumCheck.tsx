import type React from "react";

import { isAxiosError } from "axios";

import type { RealizationGridCheckResult_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import type { Tone } from "@lib/components/_shared/types/tones";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Collapsible } from "@lib/components/Collapsible";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import {
    usePropagateQueryErrorToStatusWriter,
    usePropagateQueryErrorsToStatusWriter,
} from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { ResolvedTimeSteps } from "../../settings/atoms/derivedAtoms";
import { QcCheckStatus } from "../../typesAndEnums";
import { GridCheckResult } from "../components/GridCheckResult";
import { StatusCountSummary } from "../components/StatusCountSummary";
import { VectorCheckResult } from "../components/VectorCheckResult";
import {
    computeGridRealizationStatus,
    computeSectionTone,
    computeStatusCounts,
    computeVectorRealizationStatus,
    mergeCounts,
    toneFromCounts,
} from "../utils/statusCounts";

import { useGridPropertyCheckQueries } from "./useGridPropertyCheckQueries";
import { useVectorCheckQuery } from "./useVectorCheckQuery";

export type HydrostaticEquilibriumCheckProps = {
    ensembleIdent: RegularEnsembleIdent | null;
    gridName: string | null;
    resolvedTimeSteps: ResolvedTimeSteps | null;
    gridCheckRealizations: number[];
    gridCheckThreshold: number;
    statusWriter: ViewStatusWriter;
};

// The "Initial Hydrostatic Equilibrium" QC step: a vector (summary) check and a grid property
// check, both comparing an early (t0) and a later (t1) time step. The two sub-checks share the
// same time-step banner and roll up into one combined tone/count for the step's collapsible header.
export function HydrostaticEquilibriumCheck(props: HydrostaticEquilibriumCheckProps): React.ReactNode {
    const { ensembleIdent, gridName, resolvedTimeSteps, gridCheckRealizations, gridCheckThreshold, statusWriter } =
        props;

    const caseUuid = ensembleIdent?.getCaseUuid();
    const ensembleName = ensembleIdent?.getEnsembleName();
    const enabled = Boolean(caseUuid && ensembleName && gridName);

    const { query: vectorCheckQuery, progressText: vectorCheckProgressText } = useVectorCheckQuery({
        ensembleIdent,
        caseUuid,
        ensembleName,
        t0Iso: resolvedTimeSteps?.t0Iso ?? null,
        t1Iso: resolvedTimeSteps?.t1Iso ?? null,
        enabled,
    });
    // One request per realization, so results can be populated in the client as each realization's
    // check completes rather than waiting for the whole ensemble.
    const {
        queries: gridCheckQueries,
        rescheduleRealization: rescheduleGridRealization,
        rescheduleRealizations: rescheduleGridRealizations,
    } = useGridPropertyCheckQueries({
        ensembleIdent,
        caseUuid,
        ensembleName,
        gridName,
        gridCheckRealizations,
        enabled,
    });

    const gridCheckIsFetching = gridCheckQueries.some((query) => query.isFetching);
    const gridCheckHasError = gridCheckQueries.some((query) => query.isError);
    const gridCheckCompletedCount = gridCheckQueries.filter((query) => query.isSuccess).length;
    const gridCheckResults: RealizationGridCheckResult_api[] = gridCheckQueries
        .map((query) => query.data?.realization_result)
        .filter((realizationResult) => realizationResult !== undefined);

    const isLoading = vectorCheckQuery.isFetching || gridCheckIsFetching;
    statusWriter.setLoading(isLoading);

    usePropagateQueryErrorToStatusWriter(vectorCheckQuery, statusWriter);
    usePropagateQueryErrorsToStatusWriter(gridCheckQueries, statusWriter);

    const timeSteps =
        vectorCheckQuery.data?.time_steps ?? gridCheckQueries.find((query) => query.data)?.data?.time_steps ?? null;

    const vectorCounts = vectorCheckQuery.data
        ? computeStatusCounts(
            vectorCheckQuery.data.realization_results.map((realizationResult) => ({
                status: computeVectorRealizationStatus(realizationResult, vectorCheckQuery.data.time_steps.time_gap_ok),
            })),
        )
        : null;
    // Every requested realization gets a slot in the counts, defaulting to NOT_EVALUATED_PENDING
    // until its individual request resolves (or NOT_EVALUATED_ERRORED if that request failed), so
    // the header tallies update progressively as results arrive.
    const gridCounts = computeStatusCounts(
        gridCheckRealizations.map((realization, index) => {
            const query = gridCheckQueries[index];
            const realizationResult = query?.data?.realization_result;
            let status: QcCheckStatus;
            if (realizationResult) {
                status = computeGridRealizationStatus(realizationResult, gridCheckThreshold);
            } else if (query?.isError) {
                status = QcCheckStatus.NOT_EVALUATED_ERRORED;
            } else {
                status = QcCheckStatus.NOT_EVALUATED_PENDING;
            }
            return { status };
        }),
    );

    // Realizations whose individual request failed, aligned by realization number, so the matrix can
    // render them as errored (magenta) cells instead of pending ones.
    const gridCheckErroredRealizations = gridCheckRealizations.filter(
        (_, index) => gridCheckQueries[index]?.isError,
    );

    // Explain why a not-yet-available realization has no result: either its individual request is
    // still running, or it failed (in which case we surface the error message / HTTP status).
    function getGridRealizationUnavailableReason(realization: number): string | null {
        const index = gridCheckRealizations.indexOf(realization);
        const query = gridCheckQueries[index];
        if (!query) {
            return null;
        }
        if (query.isError) {
            const error = query.error;
            if (error instanceof Error) {
                const cause = (error as { cause?: unknown }).cause;
                if (isAxiosError(cause) && cause.response?.status) {
                    return `${error.message} (HTTP ${cause.response.status})`;
                }
                return error.message;
            }
            return "The check failed for an unknown reason.";
        }
        if (query.isFetching) {
            return "The check is still running for this realization.";
        }
        return null;
    }

    const vectorTone = computeSectionTone(vectorCheckQuery, vectorCounts);
    const gridTone: Tone = gridCheckHasError ? "danger" : toneFromCounts(gridCounts);

    // The step header rolls up both sub-checks: red if either failed/errored, neutral while the
    // vector check is still loading (or nothing has resolved yet), otherwise green once everything
    // that ran has passed. The grid check's counts already fold in pending realizations as
    // NOT_EVALUATED, so the header updates progressively as individual realizations complete.
    const stepCounts = vectorCounts ? mergeCounts(vectorCounts, gridCounts) : null;
    const stepTone: Tone =
        vectorCheckQuery.isError || gridCheckHasError
            ? "danger"
            : vectorCheckQuery.isFetching || !stepCounts
                ? "neutral"
                : toneFromCounts(stepCounts);

    return (
        <Collapsible.Group
            title="Initial Hydrostatic Equilibrium"
            tone={stepTone}
            adornment={stepCounts ? <StatusCountSummary counts={stepCounts} /> : undefined}
        >
            <div className="flex flex-col gap-y-md p-md">
                {timeSteps ? (
                    <p className="text-sm text-gray-600">
                        Comparing t0 <span className="font-mono">{timeSteps.t0_iso}</span> and t1{" "}
                        <span className="font-mono">{timeSteps.t1_iso}</span> ({Math.round(timeSteps.time_gap_days)}{" "}
                        days apart
                        {timeSteps.time_gap_ok ? "" : " — gap may be too small"}).
                    </p>
                ) : (
                    <p className="text-sm text-gray-500">Resolving time steps…</p>
                )}

                <Collapsible.Group
                    title="Vector check (production / injection)"
                    tone={vectorTone}
                    adornment={vectorCounts ? <StatusCountSummary counts={vectorCounts} /> : undefined}
                >
                    <div className="flex flex-col gap-y-xs p-md">
                        {vectorCheckQuery.data ? (
                            <>
                                {vectorCheckQuery.isFetching && (
                                    <div className="flex items-center gap-x-sm text-xs text-gray-500">
                                        <CircularProgress size={16} /> Updating… {vectorCheckProgressText ?? ""}
                                    </div>
                                )}
                                <VectorCheckResult
                                    result={vectorCheckQuery.data}
                                    timeGapOk={vectorCheckQuery.data.time_steps.time_gap_ok}
                                />
                            </>
                        ) : vectorCheckQuery.isFetching ? (
                            <div className="flex items-center gap-x-sm text-sm text-gray-600">
                                <CircularProgress size={24} /> Running vector check… {vectorCheckProgressText ?? ""}
                            </div>
                        ) : vectorCheckQuery.isError ? (
                            <ContentError>Failed to run the vector check.</ContentError>
                        ) : (
                            <ContentInfo>No vector check result.</ContentInfo>
                        )}
                    </div>
                </Collapsible.Group>

                <Collapsible.Group
                    title="Grid property check"
                    tone={gridTone}
                    adornment={<StatusCountSummary counts={gridCounts} />}
                >
                    <div className="flex flex-col gap-y-xs p-md">
                        {gridCheckResults.length > 0 || gridCheckErroredRealizations.length > 0 ? (
                            <>
                                {gridCheckIsFetching && (
                                    <div className="flex items-center gap-x-sm text-xs text-gray-500">
                                        <CircularProgress size={16} /> Updating… ({gridCheckCompletedCount}/
                                        {gridCheckRealizations.length} realizations complete)
                                    </div>
                                )}
                                <GridCheckResult
                                    realizations={gridCheckRealizations}
                                    results={gridCheckResults}
                                    erroredRealizations={gridCheckErroredRealizations}
                                    getUnavailableReason={getGridRealizationUnavailableReason}
                                    onRescheduleRealization={rescheduleGridRealization}
                                    onRescheduleRealizations={rescheduleGridRealizations}
                                    threshold={gridCheckThreshold}
                                />
                            </>
                        ) : gridCheckIsFetching ? (
                            <div className="flex items-center gap-x-sm text-sm text-gray-600">
                                <CircularProgress size={24} /> Running grid property check… ({gridCheckCompletedCount}/
                                {gridCheckRealizations.length})
                            </div>
                        ) : gridCheckHasError ? (
                            <ContentError>Failed to run the grid property check.</ContentError>
                        ) : (
                            <ContentInfo>No grid property check result.</ContentInfo>
                        )}
                    </div>
                </Collapsible.Group>
            </div>
        </Collapsible.Group>
    );
}
