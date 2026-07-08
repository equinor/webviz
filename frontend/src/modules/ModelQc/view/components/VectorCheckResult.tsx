import React from "react";

import type { HydrostaticVectorCheckResult_api, RealizationVectorCheckResult_api } from "@api";
import { Table } from "@lib/components/Table";

import { computeVectorRealizationStatus } from "../utils/statusCounts";

import { PassFailIndicator } from "./PassFailIndicator";
import { RealizationStatusMatrix } from "./RealizationStatusMatrix";
import type { RealizationCell } from "./RealizationStatusMatrix";
import { StatusBadge } from "./StatusBadge";

export type VectorCheckResultProps = {
    result: HydrostaticVectorCheckResult_api;
    timeGapOk: boolean;
};

function makeHoverLines(realizationResult: RealizationVectorCheckResult_api): string[] {
    const nonZeroVectors = realizationResult.vector_values.filter((v) => !v.is_zero);
    if (nonZeroVectors.length === 0) {
        return [];
    }
    return nonZeroVectors.map((v) => {
        const value =
            v.value_at_t1 === null || v.value_at_t1 === undefined ? "n/a" : v.value_at_t1.toPrecision(4);
        return `${v.vector_name}: ${value}`;
    });
}

function SelectedVectorDetail(props: {
    realizationResult: RealizationVectorCheckResult_api;
    timeGapOk: boolean;
}): React.ReactNode {
    const { realizationResult, timeGapOk } = props;
    return (
        <div className="flex flex-col gap-y-xs rounded-md border border-gray-200 bg-gray-50 p-md">
            <div className="flex items-center gap-x-sm">
                <span className="text-sm font-semibold">Realization {realizationResult.realization}</span>
                <StatusBadge status={computeVectorRealizationStatus(realizationResult, timeGapOk)} />
            </div>
            <Table.Root layoutClassName="w-full" size="small">
                <Table.Head>
                    <Table.Column colKey="vector_name">Vector</Table.Column>
                    <Table.Column colKey="value_at_t1">Value at t1</Table.Column>
                    <Table.Column colKey="is_zero">Zero</Table.Column>
                </Table.Head>
                <Table.Body>
                    {realizationResult.vector_values.map((vectorValue) => (
                        <Table.Row key={vectorValue.vector_name} rowKey={vectorValue.vector_name}>
                            <Table.Cell layoutClassName="font-mono">{vectorValue.vector_name}</Table.Cell>
                            <Table.Cell>
                                {vectorValue.value_at_t1 === null || vectorValue.value_at_t1 === undefined
                                    ? "n/a"
                                    : vectorValue.value_at_t1.toPrecision(4)}
                            </Table.Cell>
                            <Table.Cell>
                                <PassFailIndicator passed={vectorValue.is_zero} passedLabel="Yes" failedLabel="No" />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </div>
    );
}

export function VectorCheckResult(props: VectorCheckResultProps): React.ReactNode {
    const { result, timeGapOk } = props;
    const [selectedRealization, setSelectedRealization] = React.useState<number | null>(null);

    const cells: RealizationCell[] = React.useMemo(
        () =>
            result.realization_results.map((realizationResult) => ({
                realization: realizationResult.realization,
                status: computeVectorRealizationStatus(realizationResult, timeGapOk),
                hoverLines: makeHoverLines(realizationResult),
            })),
        [result.realization_results, timeGapOk],
    );

    const selectedResult =
        selectedRealization === null
            ? null
            : (result.realization_results.find((r) => r.realization === selectedRealization) ?? null);

    return (
        <div className="flex flex-col gap-y-sm">
            <RealizationStatusMatrix
                cells={cells}
                selectedRealization={selectedRealization}
                onSelectRealization={setSelectedRealization}
            />
            {selectedResult ? (
                <SelectedVectorDetail realizationResult={selectedResult} timeGapOk={timeGapOk} />
            ) : (
                <div className="text-xs text-gray-400 italic">Click a cell to inspect a realization.</div>
            )}
        </div>
    );
}
