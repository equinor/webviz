import type React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import { Close } from "@mui/icons-material";

import type { CaseInfo_api } from "@api";
import { edsDateRangeToEpochMsRange } from "@framework/utils/edsDateUtils";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import type { ColumnFilterImplementationProps, TableColumns } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import { formatDate } from "@lib/utils/dates";

import { AuthorCell, CaseNameAndIdCell, DescriptionCell } from "./_components";
import type { CaseRowData } from "./_types";

export function storeStateInLocalStorage(stateName: string, value: string) {
    localStorage.setItem(stateName, value);
}

export function readInitialStateFromLocalStorage(stateName: string): string {
    const storedState = localStorage.getItem(stateName);
    if (storedState && typeof storedState === "string") {
        return storedState;
    }
    return "";
}

/**
 * Creates the table columns for the case selection table.
 *
 * Note: The row data caseId is not used as a column, but is used as a unique identifier for each row.
 */
export function makeCaseTableColumns(
    statusOptions: string[],
    disabledFilterComponents: { disableAuthorComponent: boolean; disableStatusComponent: boolean },
): TableColumns<CaseRowData> {
    return [
        {
            label: "Name / id",
            _type: "data",
            columnId: "caseName",
            sizeInPercent: 30,
            renderData: (value, context) => (
                <CaseNameAndIdCell caseName={value} caseId={context.entry.caseId} cellRowSelected={context.selected} />
            ),
            filter: {
                predicate: (filterValue, dataValue, _, context) =>
                    predicateCaseNameAndIdFilter(filterValue, dataValue, context.entry.caseId),
                render: (props) => filterInput(props),
            },
        },
        {
            label: "Description",
            _type: "data",
            columnId: "description",
            sizeInPercent: 25,
            showTooltip: true,
            renderData: (value) => <DescriptionCell description={value} />,
            filter: { render: (props) => filterInput(props) },
        },
        {
            label: "Author",
            _type: "data",
            columnId: "author",
            sizeInPercent: 15,
            filter: {
                render: (props) => filterInput(props, disabledFilterComponents.disableAuthorComponent),
            },
            renderData: (value) => <AuthorCell author={value} />,
        },
        {
            label: "Status",
            _type: "data",
            columnId: "status",
            sizeInPercent: 10,
            filter: {
                render: (props) => (
                    <TagPicker
                        selection={(props.value as string[]) ?? []}
                        showListAsSelectionCount={true}
                        tagOptions={statusOptions.map((elm) => ({ label: elm, value: elm }))}
                        disabled={disabledFilterComponents.disableStatusComponent}
                        onChange={(selectedItems) => props.onFilterChange(selectedItems)}
                    />
                ),
                predicate: (selectedItems: string[], dataValue) => predicateStatusSelection(selectedItems, dataValue),
            },
        },
        {
            label: "Date",
            _type: "data",
            columnId: "dateUtcMs",
            sizeInPercent: 20,
            formatValue: (value) => formatDate(value),
            filter: {
                render: (props) => (
                    <DateRangePicker
                        className="overflow-hidden border border-gray-300 rounded focus-within:border-indigo-500 webviz-eds-date-range-picker --compact"
                        value={props.value ?? { from: null, to: null }}
                        onChange={props.onFilterChange}
                    />
                ),
                predicate: (filterValue, dataValue) => predicateDateRangePick(filterValue, dataValue),
            },
        },
    ];
}

export function makeCaseRowData(apiData: CaseInfo_api[]): CaseRowData[] {
    // Sorting have to be done outside of this function
    return apiData.map((item) => ({
        caseId: item.uuid,
        caseName: item.name,
        description: item.description,
        author: item.user,
        status: item.status,
        dateUtcMs: item.updatedAtUtcMs,
    }));
}

function predicateCaseNameAndIdFilter(filterValue: string, dataValue: string, caseId: string): boolean {
    const caseNameAndId = `${dataValue} - ${caseId}`.toLowerCase();
    filterValue = filterValue.toLowerCase();

    // Case name and id is full string, check if filterValue is a substring
    if (caseNameAndId.includes(filterValue)) return true;
    return caseNameAndId === filterValue;
}

function predicateStatusSelection(filterValues: string[], dataValue: string): boolean {
    if (typeof dataValue !== "string") return true;
    if (!filterValues || filterValues.length === 0) return true;

    return filterValues.some((filterValue) => filterValue.toLowerCase() === dataValue.toLowerCase());
}

function predicateDateRangePick(dateRange: { from: Date | null; to: Date | null }, dataValue: number): boolean {
    const epochMsRange = edsDateRangeToEpochMsRange(dateRange);

    if (!epochMsRange) {
        return true;
    }
    if (epochMsRange.from && epochMsRange.to) {
        return dataValue >= epochMsRange.from && dataValue <= epochMsRange.to;
    }
    if (epochMsRange.from) {
        return dataValue >= epochMsRange.from;
    }
    if (epochMsRange.to) {
        return dataValue <= epochMsRange.to;
    }

    // Not expected to reach this point
    return false;
}

/**
 * This is copy of default filter render component from Table, with added possibility to disable the input
 * and adjusted wrapper class name to fit adjust the height to match the other filter components in the case table.
 *
 * Note: End-adornment is similar to the one in TagInput for consistency in table.
 */
function filterInput(props: ColumnFilterImplementationProps<string>, disableFilter?: boolean): React.ReactNode {
    const value = props.value ?? "";

    if (value && typeof value !== "string")
        throw Error(`Default filter expects string value, but received type '${typeof value}'`);

    return (
        <Input
            type="text"
            value={value}
            disabled={disableFilter}
            placeholder="Filter ..."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onFilterChange(e.target.value || null)}
            endAdornment={
                <IconButton
                    className="align-middle focus:outline-2 outline-blue-300"
                    title="Clear filter"
                    onClick={() => props.onFilterChange(null)}
                >
                    <Close fontSize="inherit" />
                </IconButton>
            }
        />
    );
}
