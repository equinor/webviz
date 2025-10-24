import type React from "react";

import { DateRangePicker } from "@equinor/eds-core-react";
import { Close } from "@mui/icons-material";

import { UserAvatar } from "@framework/internal/components/UserAvatar";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import type { ColumnFilterImplementationProps, TableColumns } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import { formatDate } from "@lib/utils/dates";
import type { CaseInfo_api } from "src/api/autogen/types.gen";

import { CaseNameAndIdCell } from "./_components";
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
            renderData: (value, context) => (
                <div className="flex justify-center gap-1">
                    <UserAvatar key={context.entry.caseId} userIdent={`${value}@equinor.com`} />
                    <span
                        className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap w-full block"
                        title={value}
                    >
                        {value}
                    </span>
                </div>
            ),
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
    // Sort after mapping to prevent mutating the original apiData-array
    return apiData
        .map((item) => ({
            caseId: item.uuid,
            caseName: item.name,
            description: item.description,
            author: item.user,
            status: item.status,
            dateUtcMs: item.updatedAtUtcMs,
        }))
        .sort((a, b) => b.dateUtcMs - a.dateUtcMs); // Newest first
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

function predicateDateRangePick(dateRange: { from: Date; to: Date }, dataValue: number): boolean {
    return dataValue >= dateRange.from.getTime() && dataValue <= dateRange.to.getTime();
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
