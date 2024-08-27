import React from "react";

import { Table, TableHeading, TableProps } from "@lib/components/Table/table";
import { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";

import { SensitivityResponseDataset } from "../utils/sensitivityResponseCalculator";

export interface SensitivityTableProps {
    sensitivityResponseDataset: SensitivityResponseDataset;
    hideZeroY: boolean;
    onSelectedSensitivity?: (selectedSensitivity: SelectedSensitivity) => void;
}
const numFormat = (number: number): string => {
    return Intl.NumberFormat("en", { notation: "compact", minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(
        number
    );
};
enum TableColumns {
    RESPONSE = "Response",
    SENSITIVITY = "Sensitivity",
    DELTA_LOW = "Delta low",
    DELTA_HIGH = "Delta high",
    TRUE_LOW = "True low",
    TRUE_HIGH = "True high",
    LOW_REALS = "Low #reals",
    HIGH_REALS = "High #reals",
    REFERENCE = "Reference",
}
const tableHeading: TableHeading = {
    [TableColumns.RESPONSE]: { label: TableColumns.RESPONSE, sizeInPercent: 9 },
    [TableColumns.SENSITIVITY]: { label: TableColumns.SENSITIVITY, sizeInPercent: 9 },
    [TableColumns.DELTA_LOW]: { label: TableColumns.DELTA_LOW, sizeInPercent: 9 },
    [TableColumns.DELTA_HIGH]: { label: TableColumns.DELTA_HIGH, sizeInPercent: 9 },
    [TableColumns.TRUE_LOW]: { label: TableColumns.TRUE_LOW, sizeInPercent: 9 },
    [TableColumns.TRUE_HIGH]: { label: TableColumns.TRUE_HIGH, sizeInPercent: 9 },
    [TableColumns.LOW_REALS]: { label: TableColumns.LOW_REALS, sizeInPercent: 9 },
    [TableColumns.HIGH_REALS]: { label: TableColumns.HIGH_REALS, sizeInPercent: 9 },
    [TableColumns.REFERENCE]: { label: TableColumns.REFERENCE, sizeInPercent: 9 },
};

const SensitivityTable: React.FC<SensitivityTableProps> = (props) => {
    const [tableRows, setTableRows] = React.useState<any>([]);

    React.useEffect(() => {
        let filteredSensitivityResponses = props.sensitivityResponseDataset.sensitivityResponses;
        if (props.hideZeroY) {
            filteredSensitivityResponses = filteredSensitivityResponses.filter(
                (s) => s.lowCaseReferenceDifference !== 0.0 || s.highCaseReferenceDifference !== 0.0
            );
        }
        const rows = filteredSensitivityResponses
            .slice()
            .reverse()
            .map((sensitivityResponse) => ({
                [TableColumns.RESPONSE]: props.sensitivityResponseDataset.responseName,
                [TableColumns.SENSITIVITY]: sensitivityResponse.sensitivityName,
                [TableColumns.DELTA_LOW]: numFormat(sensitivityResponse.lowCaseReferenceDifference),
                [TableColumns.DELTA_HIGH]: numFormat(sensitivityResponse.highCaseReferenceDifference),
                [TableColumns.TRUE_LOW]: numFormat(sensitivityResponse.lowCaseAverage),
                [TableColumns.TRUE_HIGH]: numFormat(sensitivityResponse.highCaseAverage),
                [TableColumns.LOW_REALS]: sensitivityResponse.lowCaseRealizations.length,
                [TableColumns.HIGH_REALS]: sensitivityResponse.highCaseRealizations.length,
                [TableColumns.REFERENCE]: props.sensitivityResponseDataset.referenceSensitivity,
            }));
        setTableRows(rows);
    }, [props.sensitivityResponseDataset, props.hideZeroY]);

    const handleClick = (row: TableProps<TableHeading>["data"][0]) => {
        if (props.onSelectedSensitivity) {
            const selectedSensitivity: SelectedSensitivity = {
                selectedSensitivity: row.Sensitivity as string,
                selectedSensitivityCase: null,
            };

            props.onSelectedSensitivity(selectedSensitivity);
        }
    };
    return <Table headings={tableHeading} data={tableRows} onClick={handleClick} />;
};

export default SensitivityTable;
