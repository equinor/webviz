import type React from "react";

import { Table } from "@lib/components/Table";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { WaterfallGroupDecomposition } from "../utils/buildWaterfallPlot";
import { computeBarChangePercent, makeBarDisplayLabels } from "../utils/waterfallBarPresentation";

export type WaterfallTableProps = {
    groups: WaterfallGroupDecomposition[];
    referenceLabel: string;
    comparisonLabel: string;
};

type WaterfallTableRow = {
    key: string;
    groupLabel: string;
    barLabel: string;
    value: number;
    /** Null for the endpoint bars, which are volumes rather than changes. */
    changePercent: number | null;
    cumulative: number;
};

const VALUE_FORMAT_OPTIONS = { unitSystem: "si", numSignificantDigits: 4 } as const;

function makeRows(props: WaterfallTableProps): WaterfallTableRow[] {
    const rows: WaterfallTableRow[] = [];
    for (const group of props.groups) {
        const { bars } = group.decomposition;
        const displayLabels = makeBarDisplayLabels(group.decomposition, props.referenceLabel, props.comparisonLabel);
        bars.forEach((bar, index) => {
            rows.push({
                key: `${group.groupLabel}-${index}`,
                groupLabel: group.groupLabel,
                barLabel: displayLabels[index],
                value: bar.value,
                changePercent: computeBarChangePercent(bars, index),
                cumulative: bar.cumulative,
            });
        });
    }
    return rows;
}

/** The waterfall bars as numbers, so the contributions can be read off and copied. */
export function WaterfallTable(props: WaterfallTableProps): React.ReactNode {
    const rows = makeRows(props);
    const hasGroupColumn = props.groups.some((group) => group.groupLabel !== "");

    return (
        <Table.Root fixed compact size="small" height="100%">
            <Table.Head sticky>
                {hasGroupColumn && <Table.Column colKey="group">Group</Table.Column>}
                <Table.Column colKey="bar">Contribution</Table.Column>
                <Table.Column colKey="value">Value</Table.Column>
                <Table.Column colKey="changePercent">Change</Table.Column>
                <Table.Column colKey="cumulative">Cumulative</Table.Column>
            </Table.Head>
            <Table.Body>
                {rows.map((row) => (
                    <Table.Row key={row.key}>
                        {hasGroupColumn && <Table.Cell>{row.groupLabel}</Table.Cell>}
                        <Table.Cell>{row.barLabel}</Table.Cell>
                        <Table.Cell>{formatNumber(row.value, VALUE_FORMAT_OPTIONS)}</Table.Cell>
                        <Table.Cell>
                            {row.changePercent === null
                                ? ""
                                : `${row.changePercent > 0 ? "+" : ""}${row.changePercent.toFixed(1)}%`}
                        </Table.Cell>
                        <Table.Cell>{formatNumber(row.cumulative, VALUE_FORMAT_OPTIONS)}</Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
}
