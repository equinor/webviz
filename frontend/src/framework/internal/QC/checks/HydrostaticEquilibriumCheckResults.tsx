import type React from "react";

import { Check, Close } from "@mui/icons-material";

import type { TimeStepPair_api } from "@api";
import { Table } from "@lib/components/Table";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { HydrostaticEquilibriumGridPropertyCheckMetrics } from "./HydrostaticEquilibriumGridPropertyCheckStep";
import { isGridPropertyValueWithinThreshold } from "./hydrostaticEquilibriumShared";
import type { HydrostaticEquilibriumVectorCheckMetrics } from "./HydrostaticEquilibriumVectorCheckStep";

function PassFailIndicator(props: { passed: boolean; passedLabel?: string; failedLabel?: string }): React.ReactNode {
    const { passed, passedLabel = "Yes", failedLabel = "No" } = props;

    return (
        <span
            className={resolveClassNames("gap-x-4xs text-body-xs inline-flex items-center font-medium", {
                "text-success-subtle": passed,
                "text-danger-subtle": !passed,
            })}
        >
            {passed ? <Check fontSize="inherit" /> : <Close fontSize="inherit" />}
            {passed ? passedLabel : failedLabel}
        </span>
    );
}

// Informational only - a short time gap doesn't fail the realization
function TimeGapWarning(props: { timeSteps: TimeStepPair_api }): React.ReactNode {
    const { timeSteps } = props;
    if (timeSteps.time_gap_ok) {
        return null;
    }

    return (
        <p className="text-warning-subtle text-body-xs mb-2xs">
            t1 is only {Number(timeSteps.time_gap_days.toFixed(1))} days after t0 - too close to start of simulation to
            be conclusive.
        </p>
    );
}

export function HydrostaticEquilibriumVectorCheckResult(props: {
    metrics: HydrostaticEquilibriumVectorCheckMetrics;
}): React.ReactNode {
    return (
        <>
            <TimeGapWarning timeSteps={props.metrics.timeSteps} />
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
                                <PassFailIndicator passed={vectorValue.is_zero} />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </>
    );
}

export function HydrostaticEquilibriumGridPropertyCheckResult(props: {
    metrics: HydrostaticEquilibriumGridPropertyCheckMetrics;
}): React.ReactNode {
    return (
        <>
            <TimeGapWarning timeSteps={props.metrics.timeSteps} />
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
        </>
    );
}
