import type React from "react";

import { Table } from "@lib/components/Table";
import type { TableColumns } from "@lib/components/Table/types";
import type { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";

import type { SensitivityResponseDataset } from "../../../_shared/SensitivityProcessing/types";
import type { SensitivityDataScaler } from "../utils/sensitivityDataScaler";

export interface SensitivityTableProps {
    sensitivityResponseDataset: SensitivityResponseDataset;
    sensitivityDataScaler: SensitivityDataScaler;
    onSelectedSensitivity?: (selectedSensitivity: SelectedSensitivity) => void;
}

type TableRowData = {
    response: string;
    sensitivity: string;
    deltaLow: string;
    deltaHigh: string;
    trueLow: string;
    trueHigh: string;
    lowReals: number;
    highReals: number;
    reference: string;
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

const tableColumns: TableColumns<TableRowData> = [
    {
        _type: "data",
        columnId: "response",
        label: "Response",
        sizeInPercent: 15,
    },
    {
        _type: "data",
        columnId: "sensitivity",
        label: "Sensitivity",
        sizeInPercent: 15,
    },
    {
        _type: "data",
        columnId: "deltaLow",
        label: "Delta low",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "deltaHigh",
        label: "Delta high",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "trueLow",
        label: "True low",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "trueHigh",
        label: "True high",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "lowReals",
        label: "Low #reals",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "highReals",
        label: "High #reals",
        sizeInPercent: 10,
    },
    {
        _type: "data",
        columnId: "reference",
        label: "Reference",
        sizeInPercent: 10,
    },
];

const SensitivityTable: React.FC<SensitivityTableProps> = ({
    sensitivityResponseDataset,
    sensitivityDataScaler,
    onSelectedSensitivity,
}) => {
    const isPercentage = sensitivityDataScaler.isRelativePercentage;
    const tableRows: TableRowData[] = sensitivityResponseDataset.sensitivityResponses
        .slice()
        .reverse()
        .map((sensitivityResponse) => ({
            response: sensitivityResponseDataset.responseName || "",
            sensitivity: sensitivityResponse.sensitivityName,
            deltaLow: numFormat(sensitivityDataScaler.calculateLowLabelValue(sensitivityResponse), isPercentage),
            deltaHigh: numFormat(sensitivityDataScaler.calculateHighLabelValue(sensitivityResponse), isPercentage),
            trueLow: numFormat(sensitivityResponse.lowCaseAverage),
            trueHigh: numFormat(sensitivityResponse.highCaseAverage),
            lowReals: sensitivityResponse.lowCaseRealizations.length,
            highReals: sensitivityResponse.highCaseRealizations.length,
            reference: numFormat(sensitivityResponseDataset.referenceAverage),
        }));

    const handleClick = (id: string, row: TableRowData) => {
        if (onSelectedSensitivity) {
            const selectedSensitivity: SelectedSensitivity = {
                selectedSensitivity: row.sensitivity,
                selectedSensitivityCase: null,
            };

            onSelectedSensitivity(selectedSensitivity);
        }
    };

    return <Table columns={tableColumns} rows={tableRows} rowIdentifier="sensitivity" onRowClick={handleClick} />;
};

export default SensitivityTable;
