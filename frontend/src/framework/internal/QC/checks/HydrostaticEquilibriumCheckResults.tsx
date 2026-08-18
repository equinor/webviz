import type React from "react";

import { Check, Close } from "@mui/icons-material";

import { Table } from "@lib/components/Table";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { HydrostaticEquilibriumGridPropertyCheckMetrics } from "./HydrostaticEquilibriumGridPropertyCheckStep";
import type { HydrostaticEquilibriumVectorCheckMetrics } from "./HydrostaticEquilibriumVectorCheckStep";
import { isGridPropertyValueWithinThreshold } from "./hydrostaticEquilibriumShared";

// Compact pass/fail indicator used in table cells - ported from `ModelQc`'s `PassFailIndicator`.
function PassFailIndicator(props: { passed: boolean; passedLabel?: string; failedLabel?: string }): React.ReactNode {
    const { passed, passedLabel = "Yes", failedLabel = "No" } = props;

    return (
        <span
            className={resolveClassNames("inline-flex items-center gap-x-4xs text-body-xs font-medium", {
                "text-success-subtle": passed,
                "text-danger-subtle": !passed,
            })}
        >
            {passed ? <Check fontSize="inherit" /> : <Close fontSize="inherit" />}
            {passed ? passedLabel : failedLabel}
        </span>
    );
}

// Ported from `ModelQc`'s per-realization vector-check table (`SelectedVectorDetail` in
// `VectorCheckResult.tsx`).
export function HydrostaticEquilibriumVectorCheckResult(props: {
    metrics: HydrostaticEquilibriumVectorCheckMetrics;
}): React.ReactNode {
    return (
        <Table.Root layoutClassName="w-full" size="small">
            <Table.Head>
                <Table.Column colKey="vector_name">Vector</Table.Column>
                <Table.Column colKey="value_at_t1">Value at t1</Table.Column>
                <Table.Column colKey="is_zero">Zero</Table.Column>
            </Table.Head>
            <Table.Body>
                {props.metrics.vectorValues.map((vectorValue) => (
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
    );
}

// Ported from `ModelQc`'s per-realization grid-property-check table (`SelectedGridDetail` in
// `GridCheckResult.tsx`).
export function HydrostaticEquilibriumGridPropertyCheckResult(props: {
    metrics: HydrostaticEquilibriumGridPropertyCheckMetrics;
}): React.ReactNode {
    return (
        <Table.Root layoutClassName="w-full" size="small">
            <Table.Head>
                <Table.Column colKey="property_name">Property</Table.Column>
                <Table.Column colKey="max_abs_change">Max abs change</Table.Column>
                <Table.Column colKey="max_rel_change">Max rel change</Table.Column>
                <Table.Column colKey="within_threshold">Within threshold</Table.Column>
            </Table.Head>
            <Table.Body>
                {props.metrics.propertyValues.map((propertyValue) => (
                    <Table.Row key={propertyValue.property_name} rowKey={propertyValue.property_name}>
                        <Table.Cell layoutClassName="font-mono">{propertyValue.property_name}</Table.Cell>
                        <Table.Cell>{propertyValue.max_abs_change.toPrecision(4)}</Table.Cell>
                        <Table.Cell>{propertyValue.max_rel_change.toPrecision(4)}</Table.Cell>
                        <Table.Cell>
                            <PassFailIndicator passed={isGridPropertyValueWithinThreshold(propertyValue)} />
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
}
