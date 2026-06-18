import React from "react";

import { orderBy } from "lodash";

import { Table } from "@lib/newComponents/Table";
import type { TableSortState } from "@lib/newComponents/Table/typesAndEnums";
import { SortDirection } from "@lib/newComponents/Table/typesAndEnums";
import type { SensitivityResponseDataset } from "@modules/_shared/SensitivityProcessing";

import type { SensitivityDataScaler } from "../utils/sensitivityDataScaler";

export interface SensitivityTableProps {
    sensitivityResponseDataset: SensitivityResponseDataset;
    sensitivityDataScaler: SensitivityDataScaler;
}

type TableRowData = {
    response: string;
    sensitivity: string;
    deltaLow: number;
    deltaHigh: number;
    mean: number | null;
    trueLow: number;
    trueHigh: number;
    lowReals: number;
    highReals: number;
    reference: number;
};
const numFormat = (number: number, isPercentage = false): string => {
    return (
        Intl.NumberFormat("en", {
            notation: "compact",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            style: "decimal",
        }).format(number) + (isPercentage ? "%" : "")
    );
};

const SensitivityTable: React.FC<SensitivityTableProps> = ({ sensitivityResponseDataset, sensitivityDataScaler }) => {
    const [columnSorting, setColumnSorting] = React.useState<TableSortState | null>(null);

    const isPercentage = sensitivityDataScaler.isRelativePercentage;
    const tableRows: TableRowData[] = sensitivityResponseDataset.sensitivityResponses
        .slice()
        .reverse()
        .map((sensitivityResponse) => ({
            response: sensitivityResponseDataset.responseName || "",
            sensitivity: sensitivityResponse.sensitivityName,
            deltaLow: sensitivityDataScaler.calculateLowLabelValue(sensitivityResponse),
            deltaHigh: sensitivityDataScaler.calculateHighLabelValue(sensitivityResponse),
            mean: sensitivityResponse.sensitivityAverage ?? null,
            trueLow: sensitivityResponse.lowCaseAverage,
            trueHigh: sensitivityResponse.highCaseAverage,
            lowReals: sensitivityResponse.lowCaseRealizations.length,
            highReals: sensitivityResponse.highCaseRealizations.length,
            reference: sensitivityResponseDataset.referenceAverage,
        }));

    const sortedRows = React.useMemo(
        function sortRows() {
            if (!columnSorting || columnSorting.direction === SortDirection.NONE) {
                return tableRows;
            }
            return orderBy(tableRows, [columnSorting.columnKey], [columnSorting.direction]);
        },
        // tableRows is recomputed every render; depend on the underlying inputs instead
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sensitivityResponseDataset, sensitivityDataScaler, isPercentage, columnSorting],
    );

    return (
        <div className="h-full">
            <Table.Root
                size="small"
                sortable
                columnSorting={columnSorting}
                onChangeColumnSort={setColumnSorting}
                compact
            >
                <Table.Head>
                    <Table.Column colKey="response" widthInPercent={14}>
                        Response
                    </Table.Column>
                    <Table.Column colKey="sensitivity" widthInPercent={14}>
                        Sensitivity
                    </Table.Column>
                    <Table.Column colKey="deltaLow" widthInPercent={9}>
                        Delta low
                    </Table.Column>
                    <Table.Column colKey="deltaHigh" widthInPercent={9}>
                        Delta high
                    </Table.Column>
                    <Table.Column colKey="mean" widthInPercent={9}>
                        Mean
                    </Table.Column>
                    <Table.Column colKey="trueLow" widthInPercent={9}>
                        True low
                    </Table.Column>
                    <Table.Column colKey="trueHigh" widthInPercent={9}>
                        True high
                    </Table.Column>
                    <Table.Column colKey="lowReals" widthInPercent={9}>
                        Low #reals
                    </Table.Column>
                    <Table.Column colKey="highReals" widthInPercent={9}>
                        High #reals
                    </Table.Column>
                    <Table.Column colKey="reference" widthInPercent={9}>
                        Reference
                    </Table.Column>
                </Table.Head>
                <Table.Body>
                    {sortedRows.map((row) => (
                        <Table.Row key={row.sensitivity} rowKey={row.sensitivity}>
                            <Table.Cell>{row.response}</Table.Cell>
                            <Table.Cell>{row.sensitivity}</Table.Cell>
                            <Table.Cell>{numFormat(row.deltaLow, isPercentage)}</Table.Cell>
                            <Table.Cell>{numFormat(row.deltaHigh, isPercentage)}</Table.Cell>
                            <Table.Cell>{row.mean !== null ? numFormat(row.mean) : ""}</Table.Cell>
                            <Table.Cell>{numFormat(row.trueLow)}</Table.Cell>
                            <Table.Cell>{numFormat(row.trueHigh)}</Table.Cell>
                            <Table.Cell>{row.lowReals}</Table.Cell>
                            <Table.Cell>{row.highReals}</Table.Cell>
                            <Table.Cell>{numFormat(row.reference)}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </div>
    );
};

export default SensitivityTable;
