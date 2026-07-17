import React from "react";

import type { RealizationGridCheckResult_api } from "@api";
import { Button } from "@lib/components/Button";
import { Table } from "@lib/components/Table";

import { QcCheckStatus } from "../../typesAndEnums";
import { computeGridRealizationStatus, isGridPropertyWithinThreshold } from "../utils/statusCounts";

import { PassFailIndicator } from "./PassFailIndicator";
import { RealizationStatusMatrix } from "./RealizationStatusMatrix";
import type { RealizationCell } from "./RealizationStatusMatrix";
import { StatusBadge } from "./StatusBadge";

export type GridCheckResultProps = {
    // All realizations the grid property check is expected to cover. Any realization without a
    // matching entry in `results` is still computing (one request per realization) and is rendered
    // as a "not evaluated" cell until its result arrives.
    realizations: ReadonlyArray<number>;
    results: ReadonlyArray<RealizationGridCheckResult_api>;
    // Realizations whose individual request failed; rendered as errored cells instead of pending.
    erroredRealizations?: ReadonlyArray<number>;
    // Explains why a selected realization has no result yet (still running, or the error message).
    getUnavailableReason?: (realization: number) => string | null;
    // Deletes the server-side task for the realization so its check is rescheduled/recomputed.
    onRescheduleRealization?: (realization: number) => void | Promise<void>;
    // Deletes the server-side tasks for several realizations at once (used by the bulk actions).
    onRescheduleRealizations?: (realizations: number[]) => void | Promise<void>;
    threshold: number;
};

function makeHoverLines(realizationResult: RealizationGridCheckResult_api, threshold: number): string[] {
    const offendingProperties = realizationResult.property_values.filter(
        (p) => !isGridPropertyWithinThreshold(p, threshold),
    );
    if (offendingProperties.length === 0) {
        return [];
    }
    return offendingProperties.map((p) => `${p.property_name}: Δrel ${p.max_rel_change.toPrecision(3)}`);
}

function SelectedGridDetail(props: {
    realizationResult: RealizationGridCheckResult_api;
    threshold: number;
}): React.ReactNode {
    const { realizationResult, threshold } = props;
    return (
        <div className="flex flex-col gap-y-xs rounded-md border border-gray-200 bg-gray-50 p-md">
            <div className="flex items-center gap-x-sm">
                <span className="text-sm font-semibold">Realization {realizationResult.realization}</span>
                <StatusBadge status={computeGridRealizationStatus(realizationResult, threshold)} />
            </div>
            <Table.Root layoutClassName="w-full" size="small">
                <Table.Head>
                    <Table.Column colKey="property_name">Property</Table.Column>
                    <Table.Column colKey="max_abs_change">Max abs change</Table.Column>
                    <Table.Column colKey="max_rel_change">Max rel change</Table.Column>
                    <Table.Column colKey="within_threshold">Within threshold</Table.Column>
                </Table.Head>
                <Table.Body>
                    {realizationResult.property_values.map((propertyValue) => (
                        <Table.Row key={propertyValue.property_name} rowKey={propertyValue.property_name}>
                            <Table.Cell layoutClassName="font-mono">{propertyValue.property_name}</Table.Cell>
                            <Table.Cell>{propertyValue.max_abs_change.toPrecision(4)}</Table.Cell>
                            <Table.Cell>{propertyValue.max_rel_change.toPrecision(4)}</Table.Cell>
                            <Table.Cell>
                                <PassFailIndicator
                                    passed={isGridPropertyWithinThreshold(propertyValue, threshold)}
                                />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </div>
    );
}

// Shown when the user selects a realization that has no result yet - either because its check is
// still running or because it failed. Explains the situation and offers a button to delete the
// server-side task so the check is rescheduled.
function UnavailableRealizationDetail(props: {
    realization: number;
    status: QcCheckStatus;
    reason: string | null;
    onReschedule?: (realization: number) => void | Promise<void>;
}): React.ReactNode {
    const { realization, status, reason, onReschedule } = props;
    const [isRescheduling, setIsRescheduling] = React.useState(false);

    const isErrored = status === QcCheckStatus.NOT_EVALUATED_ERRORED;

    async function handleReschedule() {
        if (!onReschedule) {
            return;
        }
        setIsRescheduling(true);
        try {
            await onReschedule(realization);
        } finally {
            setIsRescheduling(false);
        }
    }

    return (
        <div className="flex flex-col gap-y-sm rounded-md border border-gray-200 bg-gray-50 p-md">
            <div className="flex items-center gap-x-sm">
                <span className="text-sm font-semibold">Realization {realization}</span>
                <StatusBadge status={status} />
            </div>
            <p className="text-sm text-gray-600">
                {reason ??
                    (isErrored
                        ? "The check failed for this realization."
                        : "The check for this realization has not completed yet.")}
            </p>
            {onReschedule ? (
                <div className="flex flex-col gap-y-xs">
                    <div>
                        <Button size="small" onClick={handleReschedule} disabled={isRescheduling}>
                            {isRescheduling ? "Rescheduling…" : "Reschedule check"}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                        Deletes the server-side task so the check for this realization is recomputed.
                    </p>
                </div>
            ) : null}
        </div>
    );
}

// A button that reschedules a set of realizations (deleting their server-side tasks), showing the
// affected count and a busy state while the request is in flight. Disabled when there is nothing to
// reschedule.
function RescheduleButton(props: {
    label: string;
    realizations: ReadonlyArray<number>;
    onReschedule: (realizations: number[]) => void | Promise<void>;
}): React.ReactNode {
    const { label, realizations, onReschedule } = props;
    const [isRescheduling, setIsRescheduling] = React.useState(false);

    async function handleClick() {
        if (realizations.length === 0) {
            return;
        }
        setIsRescheduling(true);
        try {
            await onReschedule([...realizations]);
        } finally {
            setIsRescheduling(false);
        }
    }

    return (
        <Button size="small" onClick={handleClick} disabled={isRescheduling || realizations.length === 0}>
            {isRescheduling ? "Rescheduling…" : `${label} (${realizations.length})`}
        </Button>
    );
}

export function GridCheckResult(props: GridCheckResultProps): React.ReactNode {
    const {
        realizations,
        results,
        erroredRealizations,
        getUnavailableReason,
        onRescheduleRealization,
        onRescheduleRealizations,
        threshold,
    } = props;
    const [selectedRealization, setSelectedRealization] = React.useState<number | null>(null);

    const resultByRealization = React.useMemo(() => {
        const map = new Map<number, RealizationGridCheckResult_api>();
        for (const realizationResult of results) {
            map.set(realizationResult.realization, realizationResult);
        }
        return map;
    }, [results]);

    const erroredRealizationSet = React.useMemo(
        () => new Set(erroredRealizations ?? []),
        [erroredRealizations],
    );

    const cells: RealizationCell[] = React.useMemo(
        () =>
            realizations.map((realization) => {
                const realizationResult = resultByRealization.get(realization);
                if (!realizationResult) {
                    if (erroredRealizationSet.has(realization)) {
                        return {
                            realization,
                            status: QcCheckStatus.NOT_EVALUATED_ERRORED,
                            hoverLines: ["Errored"],
                        };
                    }
                    return { realization, status: QcCheckStatus.NOT_EVALUATED_PENDING, hoverLines: ["Pending…"] };
                }
                return {
                    realization,
                    status: computeGridRealizationStatus(realizationResult, threshold),
                    hoverLines: makeHoverLines(realizationResult, threshold),
                };
            }),
        [realizations, resultByRealization, erroredRealizationSet, threshold],
    );

    const selectedResult = selectedRealization === null ? null : (resultByRealization.get(selectedRealization) ?? null);

    // Realizations without a successful result yet, i.e. everything that is still pending or errored.
    const unresolvedRealizations = React.useMemo(
        () => realizations.filter((realization) => !resultByRealization.has(realization)),
        [realizations, resultByRealization],
    );

    return (
        <div className="flex flex-col gap-y-sm">
            <RealizationStatusMatrix
                cells={cells}
                selectedRealization={selectedRealization}
                onSelectRealization={setSelectedRealization}
            />
            {selectedResult ? (
                <SelectedGridDetail realizationResult={selectedResult} threshold={threshold} />
            ) : selectedRealization !== null ? (
                <UnavailableRealizationDetail
                    realization={selectedRealization}
                    status={
                        erroredRealizationSet.has(selectedRealization)
                            ? QcCheckStatus.NOT_EVALUATED_ERRORED
                            : QcCheckStatus.NOT_EVALUATED_PENDING
                    }
                    reason={getUnavailableReason?.(selectedRealization) ?? null}
                    onReschedule={onRescheduleRealization}
                />
            ) : (
                <div className="text-xs text-gray-400 italic">Click a cell to inspect a realization.</div>
            )}
            {onRescheduleRealizations ? (
                <div className="flex flex-wrap items-center gap-sm border-t border-gray-200 pt-sm">
                    <RescheduleButton
                        label="Reschedule errored & pending"
                        realizations={unresolvedRealizations}
                        onReschedule={onRescheduleRealizations}
                    />
                    <RescheduleButton
                        label="Reschedule all"
                        realizations={realizations}
                        onReschedule={onRescheduleRealizations}
                    />
                </div>
            ) : null}
        </div>
    );
}
