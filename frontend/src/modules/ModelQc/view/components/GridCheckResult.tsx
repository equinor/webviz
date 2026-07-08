import React from "react";

import type { RealizationGridCheckResult_api } from "@api";
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

export function GridCheckResult(props: GridCheckResultProps): React.ReactNode {
    const { realizations, results, threshold } = props;
    const [selectedRealization, setSelectedRealization] = React.useState<number | null>(null);

    const resultByRealization = React.useMemo(() => {
        const map = new Map<number, RealizationGridCheckResult_api>();
        for (const realizationResult of results) {
            map.set(realizationResult.realization, realizationResult);
        }
        return map;
    }, [results]);

    const cells: RealizationCell[] = React.useMemo(
        () =>
            realizations.map((realization) => {
                const realizationResult = resultByRealization.get(realization);
                if (!realizationResult) {
                    return { realization, status: QcCheckStatus.NOT_EVALUATED, hoverLines: ["Pending…"] };
                }
                return {
                    realization,
                    status: computeGridRealizationStatus(realizationResult, threshold),
                    hoverLines: makeHoverLines(realizationResult, threshold),
                };
            }),
        [realizations, resultByRealization, threshold],
    );

    const selectedResult = selectedRealization === null ? null : (resultByRealization.get(selectedRealization) ?? null);

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
                <div className="text-xs text-gray-400 italic">
                    Realization {selectedRealization} result not available yet.
                </div>
            ) : (
                <div className="text-xs text-gray-400 italic">Click a cell to inspect a realization.</div>
            )}
        </div>
    );
}
